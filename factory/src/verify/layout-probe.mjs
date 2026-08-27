export function installCanvasLayoutProbe() {
  if (window.__GF_CANVAS_LAYOUT_PROBE__) return;

  const proto = CanvasRenderingContext2D.prototype;
  const original = {
    fillText: proto.fillText,
    strokeText: proto.strokeText,
    fillRect: proto.fillRect,
    strokeRect: proto.strokeRect,
    beginPath: proto.beginPath,
    rect: proto.rect,
    roundRect: proto.roundRect,
    fill: proto.fill,
    stroke: proto.stroke,
    measureText: proto.measureText
  };

  const calls = [];
  const pathRects = new WeakMap();
  const canvasIds = new WeakMap();
  let nextCanvasId = 1;
  const MAX_CALLS = 1024;
  const RECENT_MS = 240;

  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const round = (value, digits = 2) => {
    const factor = 10 ** digits;
    return Math.round(finite(value) * factor) / factor;
  };
  const area = (bounds) => Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
  const union = (a, b) => ({
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom)
  });
  const normalizeBounds = (bounds) => ({
    left: round(bounds.left),
    top: round(bounds.top),
    right: round(bounds.right),
    bottom: round(bounds.bottom),
    width: round(bounds.right - bounds.left),
    height: round(bounds.bottom - bounds.top)
  });
  const transformedBounds = (ctx, x, y, w, h) => {
    const matrix = typeof ctx.getTransform === 'function' ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const points = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h]
    ].map(([px, py]) => ({
      x: matrix.a * px + matrix.c * py + matrix.e,
      y: matrix.b * px + matrix.d * py + matrix.f
    }));
    return normalizeBounds({
      left: Math.min(...points.map((p) => p.x)),
      top: Math.min(...points.map((p) => p.y)),
      right: Math.max(...points.map((p) => p.x)),
      bottom: Math.max(...points.map((p) => p.y))
    });
  };
  const canvasMeta = (canvas) => {
    if (!canvasIds.has(canvas)) canvasIds.set(canvas, nextCanvasId++);
    const logicalWidth = finite(canvas?._lw, finite(canvas?.width, 0));
    const logicalHeight = finite(canvas?._lh, finite(canvas?.height, 0));
    return {
      canvasId: canvasIds.get(canvas),
      domId: String(canvas?.id || ''),
      logicalWidth,
      logicalHeight,
      intrinsicWidth: finite(canvas?.width, 0),
      intrinsicHeight: finite(canvas?.height, 0)
    };
  };
  const record = (ctx, type, bounds, extra = {}) => {
    if (!ctx?.canvas || !bounds || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.top)) return;
    calls.push({
      at: performance.now(),
      type,
      bounds: normalizeBounds(bounds),
      alpha: finite(ctx.globalAlpha, 1),
      ...canvasMeta(ctx.canvas),
      ...extra
    });
    if (calls.length > MAX_CALLS) calls.splice(0, calls.length - MAX_CALLS);
  };
  const fontSize = (ctx) => {
    const match = String(ctx.font || '').match(/([0-9]+(?:\.[0-9]+)?)px/);
    return match ? finite(match[1], 16) : 16;
  };
  const textBounds = (ctx, text, x, y, maxWidth) => {
    const metrics = original.measureText.call(ctx, text);
    let width = finite(metrics.width, 0);
    if (Number.isFinite(Number(maxWidth)) && Number(maxWidth) > 0) width = Math.min(width, Number(maxWidth));
    const size = fontSize(ctx);
    const ascent = finite(metrics.actualBoundingBoxAscent, size * 0.8);
    const descent = finite(metrics.actualBoundingBoxDescent, size * 0.2);
    const height = Math.max(1, ascent + descent);
    let left = finite(x);
    const align = String(ctx.textAlign || 'start');
    if (align === 'center') left -= width / 2;
    else if (align === 'right' || align === 'end') left -= width;
    let top = finite(y) - ascent;
    const baseline = String(ctx.textBaseline || 'alphabetic');
    if (baseline === 'top' || baseline === 'hanging') top = finite(y);
    else if (baseline === 'middle') top = finite(y) - height / 2;
    else if (baseline === 'bottom' || baseline === 'ideographic') top = finite(y) - height;
    return transformedBounds(ctx, left, top, width, height);
  };

  proto.fillText = function (...args) {
    const result = original.fillText.apply(this, args);
    try {
      const text = String(args[0] ?? '').trim();
      if (text) record(this, 'text', textBounds(this, text, args[1], args[2], args[3]), { text: text.slice(0, 160), paint: 'fillText' });
    } catch (_) {}
    return result;
  };
  proto.strokeText = function (...args) {
    const result = original.strokeText.apply(this, args);
    try {
      const text = String(args[0] ?? '').trim();
      if (text) record(this, 'text', textBounds(this, text, args[1], args[2], args[3]), { text: text.slice(0, 160), paint: 'strokeText' });
    } catch (_) {}
    return result;
  };
  proto.fillRect = function (...args) {
    const result = original.fillRect.apply(this, args);
    try { record(this, 'rect', transformedBounds(this, args[0], args[1], args[2], args[3]), { paint: 'fillRect' }); } catch (_) {}
    return result;
  };
  proto.strokeRect = function (...args) {
    const result = original.strokeRect.apply(this, args);
    try { record(this, 'rect', transformedBounds(this, args[0], args[1], args[2], args[3]), { paint: 'strokeRect' }); } catch (_) {}
    return result;
  };
  proto.beginPath = function (...args) {
    pathRects.set(this, []);
    return original.beginPath.apply(this, args);
  };
  proto.rect = function (...args) {
    const result = original.rect.apply(this, args);
    try {
      const pending = pathRects.get(this) || [];
      pending.push(transformedBounds(this, args[0], args[1], args[2], args[3]));
      pathRects.set(this, pending);
    } catch (_) {}
    return result;
  };
  if (typeof original.roundRect === 'function') {
    proto.roundRect = function (...args) {
      const result = original.roundRect.apply(this, args);
      try {
        const pending = pathRects.get(this) || [];
        pending.push(transformedBounds(this, args[0], args[1], args[2], args[3]));
        pathRects.set(this, pending);
      } catch (_) {}
      return result;
    };
  }
  const flushPathRects = (ctx, paint) => {
    const pending = pathRects.get(ctx) || [];
    for (const bounds of pending) record(ctx, 'rect', bounds, { paint });
    pathRects.set(ctx, []);
  };
  proto.fill = function (...args) {
    const result = original.fill.apply(this, args);
    try { flushPathRects(this, 'fillPathRect'); } catch (_) {}
    return result;
  };
  proto.stroke = function (...args) {
    const result = original.stroke.apply(this, args);
    try { flushPathRects(this, 'strokePathRect'); } catch (_) {}
    return result;
  };

  const dedupe = (items, keyFn) => {
    const map = new Map();
    for (const item of items) map.set(keyFn(item), item);
    return [...map.values()];
  };
  const contains = (outer, inner, slack = 6) =>
    outer.left <= inner.left + slack && outer.top <= inner.top + slack &&
    outer.right >= inner.right - slack && outer.bottom >= inner.bottom - slack;
  const intersection = (a, b) => {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  };

  const snapshot = () => {
    const cutoff = performance.now() - RECENT_MS;
    const recent = calls.filter((call) => call.at >= cutoff && call.alpha > 0.05);
    if (!recent.length) {
      return {
        source: 'playwright-canvas-draw-observation-v1',
        canvas: null,
        regions: [],
        issues: [{ type: 'no-recent-canvas-draws' }],
        recentDrawCalls: 0,
        recentTextDraws: 0
      };
    }

    const byCanvas = new Map();
    for (const call of recent) {
      const list = byCanvas.get(call.canvasId) || [];
      list.push(call);
      byCanvas.set(call.canvasId, list);
    }
    const preferred = [...byCanvas.values()].sort((a, b) => {
      const aGame = a[0]?.domId === 'game' ? 1 : 0;
      const bGame = b[0]?.domId === 'game' ? 1 : 0;
      if (aGame !== bGame) return bGame - aGame;
      return b.length - a.length;
    })[0];
    const meta = preferred[preferred.length - 1];
    const width = meta.logicalWidth || meta.intrinsicWidth;
    const height = meta.logicalHeight || meta.intrinsicHeight;
    const screenArea = Math.max(1, width * height);

    const texts = dedupe(
      preferred.filter((call) => call.type === 'text' && call.text),
      (call) => `${call.text}|${Math.round(call.bounds.left)}|${Math.round(call.bounds.top)}|${Math.round(call.bounds.right)}|${Math.round(call.bounds.bottom)}`
    );
    const rects = dedupe(
      preferred.filter((call) => call.type === 'rect' && area(call.bounds) >= 80 && area(call.bounds) <= screenArea * 0.38),
      (call) => `${Math.round(call.bounds.left)}|${Math.round(call.bounds.top)}|${Math.round(call.bounds.right)}|${Math.round(call.bounds.bottom)}`
    );

    const hudTexts = texts.filter((call) => {
      const cx = (call.bounds.left + call.bounds.right) / 2;
      const cy = (call.bounds.top + call.bounds.bottom) / 2;
      return cy <= height * 0.30 || cy >= height * 0.70 || cx <= width * 0.22 || cx >= width * 0.78;
    });

    const groups = new Map();
    for (const text of hudTexts) {
      const containers = rects
        .filter((rect) => contains(rect.bounds, text.bounds, 7))
        .sort((a, b) => area(a.bounds) - area(b.bounds));
      const container = containers[0] || null;
      const baseBounds = container ? container.bounds : text.bounds;
      const key = container
        ? `rect:${Math.round(baseBounds.left)}:${Math.round(baseBounds.top)}:${Math.round(baseBounds.right)}:${Math.round(baseBounds.bottom)}`
        : `text:${Math.round(baseBounds.left)}:${Math.round(baseBounds.top)}:${Math.round(baseBounds.right)}:${Math.round(baseBounds.bottom)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.bounds = normalizeBounds(union(existing.bounds, baseBounds));
        if (!existing.labels.includes(text.text)) existing.labels.push(text.text);
      } else {
        groups.set(key, {
          bounds: normalizeBounds(baseBounds),
          labels: [text.text],
          geometrySource: container ? `canvas-${container.paint}+text` : `canvas-${text.paint}`
        });
      }
    }

    const regions = [...groups.values()]
      .filter((region) => area(region.bounds) >= 20)
      .sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left)
      .map((region, index) => ({ id: `HUD-${String(index + 1).padStart(2, '0')}`, ...region }));
    const issues = [];
    for (const region of regions) {
      const b = region.bounds;
      if (b.left < -1 || b.top < -1 || b.right > width + 1 || b.bottom > height + 1) {
        issues.push({ type: 'out-of-bounds', regionId: region.id, bounds: b });
      }
    }
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const overlap = intersection(regions[i].bounds, regions[j].bounds);
        if (overlap.width > 3 && overlap.height > 3) {
          issues.push({
            type: 'overlap',
            regionA: regions[i].id,
            regionB: regions[j].id,
            intersection: normalizeBounds(overlap)
          });
        }
      }
    }

    return {
      source: 'playwright-canvas-draw-observation-v1',
      canvas: {
        domId: meta.domId,
        logicalWidth: width,
        logicalHeight: height,
        intrinsicWidth: meta.intrinsicWidth,
        intrinsicHeight: meta.intrinsicHeight,
        logicalIntrinsicMatch: width === meta.intrinsicWidth && height === meta.intrinsicHeight
      },
      regions,
      issues,
      recentDrawCalls: preferred.length,
      recentTextDraws: texts.length,
      hudTextDraws: hudTexts.length
    };
  };

  Object.defineProperty(window, '__GF_CANVAS_LAYOUT_PROBE__', {
    value: Object.freeze({ snapshot }),
    configurable: false,
    enumerable: false,
    writable: false
  });
}