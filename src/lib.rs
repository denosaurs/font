#[macro_use]
extern crate lazy_static;

use fontdue::Font;
use fontdue::FontSettings;

use serde::Serialize;

use std::collections::HashMap;
use std::sync::atomic::AtomicU32;
use std::sync::atomic::Ordering;
use std::sync::Mutex;

use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

static INDEX: AtomicU32 = AtomicU32::new(0);

lazy_static! {
  static ref FONTS: Mutex<HashMap<u32, Font>> = Mutex::new(HashMap::new());
}

#[wasm_bindgen]
#[serde(rename_all = "camelCase")]
#[derive(Serialize)]
pub struct Metrics {
  xmin: i32,
  ymin: i32,
  width: usize,
  height: usize,
  advance_width: f32,
  advance_height: f32,
  bounds: OutlineBounds,
}

impl From<fontdue::Metrics> for Metrics {
  fn from(metrics: fontdue::Metrics) -> Self {
    Metrics {
      xmin: metrics.xmin,
      ymin: metrics.ymin,
      width: metrics.width,
      height: metrics.height,
      advance_width: metrics.advance_width,
      advance_height: metrics.advance_height,
      bounds: OutlineBounds::from(metrics.bounds),
    }
  }
}

#[wasm_bindgen]
#[serde(rename_all = "camelCase")]
#[derive(Copy, Clone, Serialize)]
pub struct OutlineBounds {
  xmin: f32,
  ymin: f32,
  width: f32,
  height: f32,
}

impl From<fontdue::OutlineBounds> for OutlineBounds {
  fn from(bounds: fontdue::OutlineBounds) -> Self {
    OutlineBounds {
      xmin: bounds.xmin,
      ymin: bounds.ymin,
      width: bounds.width,
      height: bounds.height,
    }
  }
}

#[wasm_bindgen]
#[serde(rename_all = "camelCase")]
#[derive(Serialize)]
pub struct LineMetrics {
  ascent: f32,
  descent: f32,
  line_gap: f32,
  new_line_size: f32,
}

impl From<fontdue::LineMetrics> for LineMetrics {
  fn from(metrics: fontdue::LineMetrics) -> Self {
    LineMetrics {
      ascent: metrics.ascent,
      descent: metrics.descent,
      line_gap: metrics.line_gap,
      new_line_size: metrics.new_line_size,
    }
  }
}

#[wasm_bindgen]
#[serde(rename_all = "camelCase")]
#[derive(Serialize)]
pub struct RasterizeResult {
  metrics: Metrics,
  bitmap: Vec<u8>,
}

#[wasm_bindgen]
pub fn from_bytes(
  bytes: &[u8],
  enable_offset_bounding_box: bool,
  collection_index: u32,
  scale: f32,
) -> Result<u32, JsValue> {
  match Font::from_bytes(
    bytes,
    FontSettings {
      enable_offset_bounding_box,
      collection_index,
      scale,
    },
  ) {
    Ok(font) => {
      let id = INDEX.fetch_add(1, Ordering::SeqCst);
      FONTS.lock().unwrap().insert(id, font);
      Ok(id)
    }
    Err(err) => Err(JsValue::from_str(err)),
  }
}

#[wasm_bindgen]
pub fn horizontal_line_metrics(id: u32, px: f32) -> JsValue {
  if let Some(metrics) = FONTS
    .lock()
    .unwrap()
    .get(&id)
    .unwrap()
    .horizontal_line_metrics(px)
  {
    JsValue::from_serde(&LineMetrics::from(metrics)).unwrap()
  } else {
    JsValue::UNDEFINED
  }
}

#[wasm_bindgen]
pub fn vertical_line_metrics(id: u32, px: f32) -> JsValue {
  if let Some(metrics) = FONTS
    .lock()
    .unwrap()
    .get(&id)
    .unwrap()
    .vertical_line_metrics(px)
  {
    JsValue::from_serde(&LineMetrics::from(metrics)).unwrap()
  } else {
    JsValue::UNDEFINED
  }
}

#[wasm_bindgen]
pub fn units_per_em(id: u32) -> f32 {
  FONTS.lock().unwrap().get(&id).unwrap().units_per_em()
}

#[wasm_bindgen]
pub fn scale_factor(id: u32, px: f32) -> f32 {
  FONTS.lock().unwrap().get(&id).unwrap().scale_factor(px)
}

#[wasm_bindgen]
pub fn metrics_indexed(id: u32, index: usize, px: f32) -> JsValue {
  JsValue::from_serde(&Metrics::from(
    FONTS
      .lock()
      .unwrap()
      .get(&id)
      .unwrap()
      .metrics_indexed(index, px),
  ))
  .unwrap()
}

#[wasm_bindgen]
pub fn rasterize_indexed(id: u32, index: usize, px: f32) -> JsValue {
  let (metrics, bitmap) = FONTS
    .lock()
    .unwrap()
    .get(&id)
    .unwrap()
    .rasterize_indexed(index, px);

  JsValue::from_serde(&RasterizeResult {
    metrics: Metrics::from(metrics),
    bitmap,
  })
  .unwrap()
}

#[wasm_bindgen]
pub fn lookup_glyph_index(id: u32, character: char) -> usize {
  FONTS
    .lock()
    .unwrap()
    .get(&id)
    .unwrap()
    .lookup_glyph_index(character)
}
