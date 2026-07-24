import { resolveVisualViewportRect } from '@/hooks/useVisualViewport';

function viewport(overrides: Partial<VisualViewport> = {}) {
  return {
    width: 390,
    height: 500,
    offsetTop: 344,
    offsetLeft: 0,
    pageTop: 344,
    pageLeft: 0,
    ...overrides,
  } as VisualViewport;
}

describe('resolveVisualViewportRect', () => {
  it('keeps an overlay inside a keyboard-panned iPhone viewport', () => {
    expect(resolveVisualViewportRect(viewport(), 0, 0)).toEqual({
      width: 390,
      height: 500,
      top: 344,
      left: 0,
    });
  });

  it('falls back to pageTop when WebKit reports offsetTop too early', () => {
    expect(resolveVisualViewportRect(viewport({ offsetTop: 0 }), 0, 0).top).toBe(344);
  });

  it('removes ordinary document scrolling from page-relative coordinates', () => {
    expect(
      resolveVisualViewportRect(
        viewport({
          offsetTop: 44,
          pageTop: 244,
          offsetLeft: 12,
          pageLeft: 62,
        }),
        50,
        200
      )
    ).toMatchObject({ top: 44, left: 12 });
  });

  it('never positions the overlay at negative coordinates', () => {
    expect(
      resolveVisualViewportRect(
        viewport({
          offsetTop: -10,
          pageTop: -10,
          offsetLeft: -5,
          pageLeft: -5,
        }),
        0,
        0
      )
    ).toMatchObject({ top: 0, left: 0 });
  });
});
