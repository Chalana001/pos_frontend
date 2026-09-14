import React, { useEffect, useState } from 'react';
import { AlertTriangle, Barcode as BarcodeIcon, Scale } from 'lucide-react';

import Card from '../common/Card';
import CustomSelect from '../common/CustomSelect';
import {
  SCALE_BARCODE_VALUE_TYPE_OPTIONS,
  SCALE_BARCODE_WEIGHT_UNIT_OPTIONS,
  SCALE_BARCODE_MAX_VALUE_LENGTH,
  SCALE_BARCODE_MAX_DECIMALS,
  normalizeScalePrefixText,
  describeScaleBarcode,
  buildScaleBarcodeExample,
  parseScalePrefixes,
} from '../../utils/scaleBarcode';

// Number input with a local typing buffer; the clamp only runs on blur so a
// two-digit value is never fought mid-keystroke by the min/max.
const NumberField = ({ label, value, onCommit, min, max }) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    onCommit(Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : value);
  };

  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input aria-label={label}
        type="number"
        min={min}
        max={max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
};

/**
 * The "Scale Configuration" card on App Configuration: how the branch's own
 * weighing scale lays out the barcodes it prints, so the POS can pull a weight
 * or price out of a scanned label. Saved with the rest of the page by the
 * page's own Save button; this card only edits `form`.
 */
const ScaleBarcodeConfigCard = ({
  form,
  updateField,
  presets = [],
  presetsLoading = false,
  weightItemsEnabled = true,
  style,
}) => {
  const [testInput, setTestInput] = useState('');

  const presetOptions = presets.map((preset) => ({ value: preset.key, label: preset.label }));
  const selectedPreset = presets.find((preset) => preset.key === form.scaleBarcodePresetKey) || null;

  // Applying a preset pre-fills every field below from the chosen starting
  // template (including "Custom", which ships its own neutral defaults), the
  // admin still needs to confirm/adjust the values against their own device.
  const applyPreset = (key) => {
    const preset = presets.find((p) => p.key === key);
    if (!preset) return;
    updateField('scaleBarcodePresetKey', preset.key);
    updateField('scaleBarcodePrefix', preset.prefix || '');
    updateField('scaleBarcodePrefixLength', preset.prefixLength);
    updateField('scaleBarcodeItemCodeLength', preset.itemCodeLength);
    updateField('scaleBarcodeValueLength', preset.valueLength);
    updateField('scaleBarcodeValueType', preset.valueType);
    updateField('scaleBarcodeWeightUnit', preset.weightUnit || 'G');
    updateField('scaleBarcodeValueDecimals', preset.valueDecimals ?? 0);
    updateField('scaleBarcodeStripLeadingZeros', !!preset.stripLeadingZeros);
    updateField('scaleBarcodeHasCheckDigit', preset.hasCheckDigit);
  };

  // Live feedback for the prefix list: the backend refuses an entry whose length
  // does not match the prefix length, so say so while the admin is typing
  // rather than after a failed save.
  const prefixEntries = parseScalePrefixes(form.scaleBarcodePrefix);
  const prefixLength = Number(form.scaleBarcodePrefixLength) || 0;
  let prefixError = '';
  if (prefixLength === 0 && prefixEntries.length > 0) {
    prefixError = 'Prefix length is 0, so leave the prefix box empty.';
  } else if (prefixLength > 0) {
    const bad = prefixEntries.find((entry) => entry.length !== prefixLength);
    if (bad) prefixError = `"${bad}" is not ${prefixLength} characters long.`;
  }

  const isWeight = form.scaleBarcodeValueType !== 'PRICE';
  const enabledForm = { ...form, scaleBarcodeEnabled: true };
  const example = buildScaleBarcodeExample(form);
  const exampleResult = example ? describeScaleBarcode(example, enabledForm) : null;
  const testResult = testInput.trim() ? describeScaleBarcode(testInput, enabledForm) : null;
  const totalLength = prefixLength
    + (Number(form.scaleBarcodeItemCodeLength) || 0)
    + (Number(form.scaleBarcodeValueLength) || 0)
    + (form.scaleBarcodeHasCheckDigit ? 1 : 0);

  const title = (
    <span className="flex items-center gap-2">
      <Scale size={16} />
      Scale Configuration
    </span>
  );

  if (!weightItemsEnabled) {
    return (
      <Card className="admin-panel-card" title={title} style={style}>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Weight items are switched off above, so scale barcodes have nothing to resolve against. Turn
          weight items on to configure how your scale's labels are read.
        </p>
      </Card>
    );
  }

  return (
    <Card className="admin-panel-card" title={title} style={style}>
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-800">Read Weighing-Scale Barcodes</div>
            <div className="text-xs text-slate-500">
              Your scale prints its own labels. When on, a scanned barcode that isn't an exact item match is
              also checked against this layout to pull out the embedded weight or price.
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
            The templates below are starting points, not verified vendor specs. Every scale brand differs.
            Scan a real label into the test box at the bottom and check the numbers match before relying on
            this in the shop.
          </span>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Starting Template</label>
          <div className="mt-1">
            <CustomSelect
              value={form.scaleBarcodePresetKey}
              onChange={applyPreset}
              options={presetOptions}
              valueKey="value"
              labelKey="label"
              placeholder={presetsLoading ? 'Loading templates...' : 'Select a template or Custom'}
              disabled={presetsLoading || presetOptions.length === 0}
              buttonClassName="h-[42px] rounded-xl px-4 py-2.5"
            />
          </div>
          {selectedPreset ? (
            <p className="mt-2 text-xs text-slate-500">{selectedPreset.description}</p>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="scaleconfig-prefix" className="text-xs font-medium text-slate-500">Prefix</label>
            <input id="scaleconfig-prefix"
              type="text"
              maxLength={40}
              value={form.scaleBarcodePrefix || ''}
              onChange={(e) => updateField('scaleBarcodePrefix', normalizeScalePrefixText(e.target.value))}
              placeholder="e.g. 20 or 20,21,22 or NS"
              className={`mt-1 h-9 w-full rounded-lg border bg-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none ${prefixError ? 'border-red-400' : 'border-slate-300'}`}
            />
            <p className={`mt-1 text-[11px] ${prefixError ? 'text-red-600' : 'text-slate-500'}`}>
              {prefixError || 'Letters allowed. Separate several prefixes with commas. Leave empty to accept any.'}
            </p>
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
            label="Value Length (digits)"
            min={1}
            max={SCALE_BARCODE_MAX_VALUE_LENGTH}
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
          {isWeight ? (
            <div>
              <label className="text-xs font-medium text-slate-500">Weight Unit</label>
              <div className="mt-1">
                <CustomSelect
                  value={form.scaleBarcodeWeightUnit || 'G'}
                  onChange={(v) => updateField('scaleBarcodeWeightUnit', v)}
                  options={SCALE_BARCODE_WEIGHT_UNIT_OPTIONS}
                  buttonClassName="h-9 rounded-lg px-3"
                />
              </div>
            </div>
          ) : null}
          <NumberField
            label="Decimal Places (implied)"
            min={0}
            max={SCALE_BARCODE_MAX_DECIMALS}
            value={form.scaleBarcodeValueDecimals}
            onCommit={(v) => updateField('scaleBarcodeValueDecimals', v)}
          />
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm text-slate-700">Ignore leading zeros in item code</span>
            <input
              type="checkbox"
              checked={!!form.scaleBarcodeStripLeadingZeros}
              onChange={(e) => updateField('scaleBarcodeStripLeadingZeros', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
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

        {example && exampleResult ? (
          <p className="text-xs text-slate-600">
            With these settings a label of {totalLength} characters such as{' '}
            <span className="font-mono text-slate-800">{example}</span>{' '}
            {exampleResult.ok
              ? <>reads as <span className="font-medium text-slate-800">{exampleResult.display}</span>.</>
              : <>would be refused: {exampleResult.reason}</>}
          </p>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <label htmlFor="scaleconfig-test" className="text-xs font-medium text-slate-500">
            Test a barcode from a real label
          </label>
          <input id="scaleconfig-test"
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Scan a label from your scale here, or type what it prints"
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
          {testResult ? (
            <div className="mt-2 space-y-2 text-xs">
              {testResult.prefix !== undefined ? (
                <div className="flex flex-wrap gap-1 font-mono">
                  {testResult.prefix ? (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800" title="Prefix">{testResult.prefix}</span>
                  ) : null}
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800" title="Item code">{testResult.itemCode}</span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800" title="Value">{testResult.valueDigits}</span>
                  {testResult.checkDigit ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700" title="Check digit">{testResult.checkDigit}</span>
                  ) : null}
                </div>
              ) : null}
              {testResult.ok ? (
                <p className="text-emerald-700">
                  Decodes as <span className="font-medium">{testResult.display}</span>. The POS will look for a weight
                  item whose barcode is <span className="font-mono">{testResult.itemCode}</span>.
                  {form.scaleBarcodeHasCheckDigit && !testResult.checkDigitVerified ? (
                    <span className="text-slate-500"> The check digit is taken as printed, not verified, because the layout contains letters.</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-red-600">Not a scale barcode with these settings: {testResult.reason}</p>
              )}
            </div>
          ) : null}
        </div>

        <p className="text-xs text-slate-600">
          <BarcodeIcon size={12} className="mr-1 inline" />
          Only applies to items priced by weight, whose barcode in the POS is the item code the scale prints.
          A scan that decodes but doesn't match a weighed item is treated as a normal barcode lookup. Layouts
          with an extra check digit between the item code and the value are not supported.
        </p>
      </div>
    </Card>
  );
};

export default ScaleBarcodeConfigCard;
