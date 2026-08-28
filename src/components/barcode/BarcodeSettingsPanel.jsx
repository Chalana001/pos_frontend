import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Barcode as BarcodeIcon,
  Bold,
  Italic,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Ticket,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';

import Card from '../common/Card';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import BarcodeLabel from './BarcodeLabel';
import {
  BARCODE_FORMAT_OPTIONS,
  BARCODE_ELEMENT_TYPE_OPTIONS,
  BARCODE_ELEMENT_ALIGN_OPTIONS,
  BARCODE_ELEMENT_TEXT_TYPES,
  ITEM_NAME_SOURCE_OPTIONS,
  LABEL_SIZE_PRESETS,
  EXPIRY_DATE_FORMAT_OPTIONS,
  SCALE_BARCODE_VALUE_TYPE_OPTIONS,
  CUSTOM_SIZE_OPTION,
  mmToInch,
  inchToMm,
} from '../../utils/barcodeLabelSettings';

const PREVIEW_ITEM = {
  name: 'Basmathi Rice 5kg',
  altName: 'බාස්මති සහල් 5kg',
  barcode: '4791234567890',
  sellingPrice: 1250,
  labelExpiry: '2026-12-31T00:00:00',
};

// Font-size range for label elements (5–24px).
const ELEMENT_FONT_SIZES = Array.from({ length: 20 }, (_, i) => i + 5);

// Per-type config for the free-text input shown in an element's expander.
const TEXT_INPUT_CONFIG = {
  SHOP_NAME:   { label: 'Shop Name Text', placeholder: 'Leave empty for shop default', max: 60 },
  PRICE:       { label: 'Price Prefix',   placeholder: 'e.g. Rs.',                     max: 10 },
  EXPIRY:      { label: 'Expiry Prefix',  placeholder: 'e.g. EXP:',                    max: 20 },
  FOOTER:      { label: 'Footer Text',    placeholder: 'e.g. Thank you for shopping',  max: 80 },
  CUSTOM_TEXT: { label: 'Text',           placeholder: 'Custom text here...',          max: 80 },
};

const ELEMENT_TYPE_LABELS = BARCODE_ELEMENT_TYPE_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

// Generic number input with a local typing buffer — clamping/normalization only
// happens onBlur (via onCommit), so partial/multi-digit input never gets fought
// mid-keystroke by the min/max clamp (e.g. typing "40" into a min-20 field used
// to jump to 20 after the first digit).
const NumberField = ({ label, value, onCommit, min, max, step = 1, suffix }) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    onCommit(Number.isFinite(parsed) ? parsed : value);
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-1">
        <input aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
};

// Same local-buffer/commit-on-blur pattern as NumberField, plus mm<->inch
// conversion for the physical label-size fields. Storage is always mm
// (backend columns are integer mm); the unit toggle is a display convenience.
const SizeField = ({ label, mmValue, unit, onCommitMm }) => {
  const displayFromMm = (mm) => (unit === 'in' ? String(Math.round(mmToInch(mm) * 100) / 100) : String(mm));
  const [text, setText] = useState(() => displayFromMm(mmValue));

  useEffect(() => {
    setText(displayFromMm(mmValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mmValue, unit]);

  const commit = () => {
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      setText(displayFromMm(mmValue));
      return;
    }
    const mm = unit === 'in' ? inchToMm(parsed) : Math.round(parsed);
    onCommitMm(mm);
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-1">
        <input aria-label={label}
          type="number"
          step={unit === 'in' ? 0.01 : 1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {unit === 'in' ? 'in' : 'mm'}
        </span>
      </div>
    </div>
  );
};

// A small toggle button used inside element rows (B/I/U).
const ToggleButton = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition ${
      active
        ? 'border-blue-500 bg-blue-50 text-blue-600'
        : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
    }`}
  >
    {children}
  </button>
);

// One editable row in the Label Layout Designer.
const ElementRow = ({ element, index, count, shopName, updateElement, moveElement, removeElement }) => {
  const el = element;
  const isBarcode = el.type === 'BARCODE';
  const isItemName = el.type === 'ITEM_NAME';
  const isExpiry = el.type === 'EXPIRY';
  const isText = BARCODE_ELEMENT_TEXT_TYPES.includes(el.type);
  const textCfg = TEXT_INPUT_CONFIG[el.type];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition ${
        el.enabled === false ? 'opacity-60' : ''
      }`}
    >
      {/* Row 1: enabled + type + font + align + B/I/U + move + remove */}
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Show this element on the label"
          type="checkbox"
          checked={el.enabled !== false}
          onChange={(e) => updateElement(index, 'enabled', e.target.checked)}
          title={el.enabled === false ? 'Hidden — click to show' : 'Visible — click to hide'}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />

        <span className="flex-1 min-w-[110px] text-sm font-semibold text-slate-700">
          {ELEMENT_TYPE_LABELS[el.type] || el.type}
        </span>

        {/* Font size — hidden for BARCODE (has its own number font size) */}
        {!isBarcode ? (
          <select
            value={el.fontSize}
            onChange={(e) => updateElement(index, 'fontSize', Number(e.target.value))}
            className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {ELEMENT_FONT_SIZES.map((sz) => (
              <option key={sz} value={sz}>{sz}px</option>
            ))}
          </select>
        ) : null}

        {/* Alignment — applies to every element (text-align / barcode justify) */}
        <select
          value={el.align}
          onChange={(e) => updateElement(index, 'align', e.target.value)}
          className="h-9 w-[92px] rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {BARCODE_ELEMENT_ALIGN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Bold / Italic / Underline — text elements only */}
        {!isBarcode ? (
          <>
            <ToggleButton active={el.bold} onClick={() => updateElement(index, 'bold', !el.bold)} title="Bold">
              <Bold size={14} />
            </ToggleButton>
            <ToggleButton active={el.italic} onClick={() => updateElement(index, 'italic', !el.italic)} title="Italic">
              <Italic size={14} />
            </ToggleButton>
            <ToggleButton active={el.underline} onClick={() => updateElement(index, 'underline', !el.underline)} title="Underline">
              <Underline size={14} />
            </ToggleButton>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => moveElement(index, -1)}
          disabled={index === 0}
          title="Move up"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => moveElement(index, 1)}
          disabled={index === count - 1}
          title="Move down"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={() => removeElement(index)}
          title="Remove element"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:border-red-400 hover:bg-red-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: free-text input (shop name / prefix / footer / custom text) */}
      {isText && textCfg ? (
        <div className="mt-2 flex items-center gap-2">
          <Type size={13} className="shrink-0 text-slate-400" />
          <input aria-label="Element text"
            type="text"
            maxLength={textCfg.max}
            value={el.customText || ''}
            onChange={(e) => updateElement(index, 'customText', e.target.value)}
            placeholder={
              el.type === 'SHOP_NAME' && shopName ? `Leave empty for "${shopName}"` : textCfg.placeholder
            }
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
          />
        </div>
      ) : null}

      {/* Row 2b: Item Name — max chars + name source */}
      {isItemName ? (
        <div className="mt-2 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
          <div>
            <label htmlFor="barcodesettingspanel-max-characters" className="text-xs font-medium text-slate-500">Max Characters</label>
            <input id="barcodesettingspanel-max-characters"
              type="number"
              min={5}
              max={60}
              value={el.maxChars ?? 22}
              onChange={(e) => updateElement(index, 'maxChars', Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Name Source</label>
            <div className="mt-1">
              <CustomSelect
                value={el.itemNameSource || 'PRIMARY'}
                onChange={(v) => updateElement(index, 'itemNameSource', v)}
                options={ITEM_NAME_SOURCE_OPTIONS}
                buttonClassName="h-9 rounded-lg px-3"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Row 2c: Expiry — date format */}
      {isExpiry ? (
        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="text-xs font-medium text-slate-500">Date Format</label>
          <div className="mt-1">
            <CustomSelect
              value={el.expiryDateFormat || 'dd/MM/yyyy'}
              onChange={(v) => updateElement(index, 'expiryDateFormat', v)}
              options={EXPIRY_DATE_FORMAT_OPTIONS}
              buttonClassName="h-9 rounded-lg px-3"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Shows the earliest expiry among the item's stock batches. Hidden if no batch has an expiry date.
          </p>
        </div>
      ) : null}

      {/* Row 2d: Barcode — format, dimensions, number */}
      {isBarcode ? (
        <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Format</label>
            <div className="mt-1">
              <CustomSelect
                value={el.barcodeFormat || 'CODE128'}
                onChange={(v) => updateElement(index, 'barcodeFormat', v)}
                options={BARCODE_FORMAT_OPTIONS}
                buttonClassName="h-9 rounded-lg px-3"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              EAN-13 falls back to Code 128 if a barcode isn't a valid 12–13 digit number.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Bar Width" step={0.1} min={0.5} max={4.0} value={el.barcodeWidth} onCommit={(v) => updateElement(index, 'barcodeWidth', v)} />
            <NumberField label="Bar Height" suffix="px" min={15} max={80} value={el.barcodeHeight} onCommit={(v) => updateElement(index, 'barcodeHeight', v)} />
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-sm text-slate-700">Show Number</span>
              <input
                type="checkbox"
                checked={el.showBarcodeValue !== false}
                onChange={(e) => updateElement(index, 'showBarcodeValue', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            <NumberField label="Number Font Size" suffix="px" min={6} max={20} value={el.barcodeValueFontSize} onCommit={(v) => updateElement(index, 'barcodeValueFontSize', v)} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const BarcodePreview = ({ settings, shopName }) => (
  <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-6 shadow-sm">
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
      <BarcodeLabel item={PREVIEW_ITEM} settings={settings} shopName={shopName} />
    </div>
    <p className="mt-4 text-center text-xs text-slate-500">
      {settings.labelWidthMm}mm × {settings.labelHeightMm}mm label — actual print size may vary slightly by printer.
    </p>
  </div>
);

const BarcodeSettingsPanel = ({
  form,
  updateField,
  shopName,
  elements = [],
  addElement,
  removeElement,
  moveElement,
  updateElement,
  printerOptions,
  printAgentOnline,
  printerLoading,
  printerTesting,
  onRefreshPrinters,
  onTestPrint,
  scalePresets = [],
  scalePresetsLoading = false,
}) => {
  const [sizeUnit, setSizeUnit] = useState('mm');
  const [addElementType, setAddElementType] = useState('CUSTOM_TEXT');

  const scalePresetOptions = scalePresets.map((preset) => ({ value: preset.key, label: preset.label }));
  const selectedScalePreset = scalePresets.find((preset) => preset.key === form.scaleBarcodePresetKey) || null;

  // Applying a preset pre-fills every field below from the chosen starting
  // template (including "Custom", which ships its own neutral defaults) — the
  // admin still needs to confirm/adjust the values against their own device.
  const applyScalePreset = (key) => {
    const preset = scalePresets.find((p) => p.key === key);
    if (!preset) return;
    updateField('scaleBarcodePresetKey', preset.key);
    updateField('scaleBarcodePrefix', preset.prefix || '');
    updateField('scaleBarcodePrefixLength', preset.prefixLength);
    updateField('scaleBarcodeItemCodeLength', preset.itemCodeLength);
    updateField('scaleBarcodeValueLength', preset.valueLength);
    updateField('scaleBarcodeValueType', preset.valueType);
    updateField('scaleBarcodeHasCheckDigit', preset.hasCheckDigit);
  };

  const selectedPresetValue = LABEL_SIZE_PRESETS.some(
    (preset) => preset.w === form.labelWidthMm && preset.h === form.labelHeightMm
  )
    ? `${form.labelWidthMm}x${form.labelHeightMm}`
    : CUSTOM_SIZE_OPTION.value;

  const presetOptions = [
    ...LABEL_SIZE_PRESETS.map((preset) => ({ value: `${preset.w}x${preset.h}`, label: preset.label })),
    CUSTOM_SIZE_OPTION,
  ];

  const applyPreset = (value) => {
    if (value === CUSTOM_SIZE_OPTION.value) return;
    const preset = LABEL_SIZE_PRESETS.find((p) => `${p.w}x${p.h}` === value);
    if (!preset) return;
    updateField('labelWidthMm', preset.w);
    updateField('labelHeightMm', preset.h);
  };

  return (
    <>
      <Card
        className="admin-panel-card"
        title={
          <span className="flex items-center gap-2">
            <Ticket size={16} />
            Label Size
          </span>
        }
        style={{ animationDelay: '130ms' }}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">Preset Size</label>
              <div className="mt-1">
                <CustomSelect
                  value={selectedPresetValue}
                  onChange={applyPreset}
                  options={presetOptions}
                  valueKey="value"
                  labelKey="label"
                  buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
                />
              </div>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {['mm', 'in'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setSizeUnit(u)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    sizeUnit === u ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SizeField label="Width" unit={sizeUnit} min={20} max={120} mmValue={form.labelWidthMm} onCommitMm={(v) => updateField('labelWidthMm', v)} />
            <SizeField label="Height" unit={sizeUnit} min={15} max={100} mmValue={form.labelHeightMm} onCommitMm={(v) => updateField('labelHeightMm', v)} />
            <SizeField label="Top Padding" unit={sizeUnit} min={0} max={10} mmValue={form.paddingTopMm} onCommitMm={(v) => updateField('paddingTopMm', v)} />
          </div>
        </div>
      </Card>

      <Card
        className="admin-panel-card"
        title={
          <span className="flex items-center gap-2">
            <Layers size={16} />
            Label Layout Designer
          </span>
        }
        style={{ animationDelay: '160ms' }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Add, remove, reorder and style each element on the label. Use the checkbox to show/hide an element, the arrows to
            change its position, and B/I/U for emphasis. The live preview updates as you edit.
          </p>

          <div className="space-y-2">
            {elements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400">
                No elements. Add one below to start designing your label.
              </div>
            ) : (
              elements.map((el, index) => (
                <ElementRow
                  key={el.id}
                  element={el}
                  index={index}
                  count={elements.length}
                  shopName={shopName}
                  updateElement={updateElement}
                  moveElement={moveElement}
                  removeElement={removeElement}
                />
              ))
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={addElementType}
              onChange={(e) => setAddElementType(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {BARCODE_ELEMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => addElement(addElementType)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
            >
              <Plus size={14} />
              Add Element
            </button>
          </div>

          <p className="text-xs text-slate-400">
            <BarcodeIcon size={12} className="mr-1 inline" />
            You can add multiple <strong>Custom Text</strong> lines (e.g. warranty, weight, made-in) anywhere in the order.
          </p>
        </div>
      </Card>

      <Card
        className="admin-panel-card"
        title={
          <span className="flex items-center gap-2">
            <Scale size={16} />
            Scale Barcode
          </span>
        }
        style={{ animationDelay: '210ms' }}
      >
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-800">Decode Weighing-Scale Barcodes</div>
              <div className="text-xs text-slate-500">
                When on, a scanned barcode that isn't an exact item match is also checked against this digit
                layout to pull out an embedded weight or price.
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!form.scaleBarcodeEnabled}
              onChange={(event) => updateField('scaleBarcodeEnabled', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              The templates below are starting points, not verified vendor specs — every scale/label-printer
              brand differs. Confirm the digit layout against your own device's manual (or scan a real label
              and check the numbers below match) before relying on this in the shop.
            </span>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Starting Template</label>
            <div className="mt-1">
              <CustomSelect
                value={form.scaleBarcodePresetKey}
                onChange={applyScalePreset}
                options={scalePresetOptions}
                valueKey="value"
                labelKey="label"
                placeholder={scalePresetsLoading ? 'Loading templates...' : 'Select a template or Custom'}
                disabled={scalePresetsLoading || scalePresetOptions.length === 0}
                buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
              />
            </div>
            {selectedScalePreset ? (
              <p className="mt-2 text-xs text-slate-500">{selectedScalePreset.description}</p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <label htmlFor="barcodesettingspanel-prefix-digits" className="text-xs font-medium text-slate-500">Prefix Digits</label>
              <input id="barcodesettingspanel-prefix-digits"
                type="text"
                maxLength={4}
                value={form.scaleBarcodePrefix || ''}
                onChange={(e) => updateField('scaleBarcodePrefix', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 20"
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <NumberField
              label="Prefix Length"
              min={0}
              max={4}
              value={form.scaleBarcodePrefixLength}
              onCommit={(v) => updateField('scaleBarcodePrefixLength', v)}
            />
            <NumberField
              label="Item Code Length"
              min={1}
              max={20}
              value={form.scaleBarcodeItemCodeLength}
              onCommit={(v) => updateField('scaleBarcodeItemCodeLength', v)}
            />
            <NumberField
              label="Value Length"
              min={1}
              max={20}
              value={form.scaleBarcodeValueLength}
              onCommit={(v) => updateField('scaleBarcodeValueLength', v)}
            />
            <div>
              <label className="text-xs font-medium text-slate-500">Value Represents</label>
              <div className="mt-1">
                <CustomSelect
                  value={form.scaleBarcodeValueType}
                  onChange={(v) => updateField('scaleBarcodeValueType', v)}
                  options={SCALE_BARCODE_VALUE_TYPE_OPTIONS}
                  buttonClassName="h-9 rounded-lg px-3"
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-sm text-slate-700">Has Check Digit</span>
              <input
                type="checkbox"
                checked={!!form.scaleBarcodeHasCheckDigit}
                onChange={(e) => updateField('scaleBarcodeHasCheckDigit', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <p className="text-xs text-slate-400">
            <BarcodeIcon size={12} className="mr-1 inline" />
            Only applies to items priced by weight. A scan that decodes but doesn't match a weighed item is
            treated as a normal barcode lookup — no special handling needed.
          </p>
        </div>
      </Card>

      <Card className="admin-panel-card" title="Direct Printer" style={{ animationDelay: '250ms' }}>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-800">Use Local Printer Service</div>
              <div className="text-xs text-slate-500">
                {printAgentOnline ? 'Printer service connected on this device.' : 'Browser print fallback will be used if this is off or unavailable.'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!form.directPrintEnabled}
              onChange={(event) => updateField('directPrintEnabled', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-slate-700">Printer</label>
              <Button type="button" size="sm" variant="secondary" onClick={onRefreshPrinters} disabled={printerLoading}>
                <RefreshCw size={14} className={`mr-1 ${printerLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <CustomSelect
              value={form.printerName}
              onChange={(value) => updateField('printerName', value)}
              options={printerOptions}
              valueKey="value"
              labelKey="label"
              placeholder={printAgentOnline ? 'Select installed printer' : 'Printer service offline'}
              disabled={!printAgentOnline || printerLoading}
              buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
              emptyMessage="No printers found"
            />
          </div>

          <NumberField label="Copies" min={1} max={10} value={form.printerCopies} onCommit={(v) => updateField('printerCopies', v)} />

          <Button type="button" variant="secondary" onClick={onTestPrint} disabled={!form.printerName || printerTesting}>
            <Printer size={16} className="mr-2" />
            {printerTesting ? 'Printing...' : 'Test Print'}
          </Button>
        </div>
      </Card>
    </>
  );
};

export default BarcodeSettingsPanel;
