// ============================================================================
// Context: Shop Manager MVP - ProductForm for adding/editing products & variations
// ============================================================================
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getUnits, createProduct, createProductVariation } from '@/lib/database';
import type { Unit, Product, ProductVariation } from '@/types';
import { parseFractionalInput, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Variation {
  name: string;
  unit_id: number;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  location: string;
  _stockInput?: string;
  _minStockInput?: string;
  _mainStock?: string;
  _subStock?: string;
  _mainMinStock?: string;
  _subMinStock?: string;
}

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: any;
}

export default function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
  const { t } = useTranslation();
  // Map initialData.variations or product_variations to Variation[] for editing
  const mapInitialVariations = (data: any) => {
    if (!data) return [
      { name: '', unit_id: 1, purchase_price: 0, selling_price: 0, current_stock: 0, min_stock: 0, location: '', _stockInput: '', _minStockInput: '' },
    ];
    const variations = data.variations || data.product_variations || [];
    return variations.map((v: any) => ({
      name: v.name || '',
      unit_id: v.unit_id || 1,
      purchase_price: v.purchase_price || 0,
      selling_price: v.selling_price || 0,
      current_stock: v.current_stock ?? v.opening_stock ?? 0,
      min_stock: v.min_stock || 0,
      location: v.location || '',
      _stockInput: v.current_stock?.toString() ?? v.opening_stock?.toString() ?? '',
      _minStockInput: v.min_stock?.toString() ?? '',
    }));
  };

  const [name, setName] = useState(initialData?.name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [variations, setVariations] = useState<Variation[]>(mapInitialVariations(initialData));
  const [units, setUnits] = useState<Unit[]>([]);
  const [productId, setProductId] = useState<number | null>(initialData?.id || null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Add a new state to track saved variations
  const [savedVariations, setSavedVariations] = useState<Variation[]>([]);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    getUnits().then(units => {
      setUnits(units);
    }).catch(() => setUnits([]));
  }, []);

  useEffect(() => {
    // If initialData changes (editing a new product), update form fields
    if (initialData) {
      setName(initialData.name || '');
      setBrand(initialData.brand || '');
      setCategory(initialData.category || '');
      setVariations(mapInitialVariations(initialData));
      setProductId(initialData.id || null);
    }
  }, [initialData]);

  const handleVariationChange = (idx: number, field: keyof Variation, value: string | number) => {
    setVariations((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, [field]: field === 'name' || field === 'location' ? value : Number(value) } : v
      )
    );
  };

  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      { name: '', unit_id: units[0]?.id || 1, purchase_price: 0, selling_price: 0, current_stock: 0, min_stock: 0, location: '', _stockInput: '', _minStockInput: '' },
    ]);
  };

  const removeVariation = (idx: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update handleSaveVariant to only update local state
  const handleSaveVariant = (v: Variation, idx: number) => {
    // Move the saved variation to savedVariations
    setSavedVariations(prev => [...prev, v]);
    // Remove the saved variation from variations and add a new empty one
    setVariations((prev) => [
      ...prev.slice(0, idx),
      ...prev.slice(idx + 1),
      { name: '', unit_id: units[0]?.id || 1, purchase_price: 0, selling_price: 0, current_stock: 0, min_stock: 0, location: '', _stockInput: '', _minStockInput: '' },
    ]);
  };

  // Update handleSubmit to save the product and all saved variations to the database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (savedVariations.length === 0) {
      setError('Please add at least one product variation before saving.');
      return;
    }
    try {
      // Save the product first
      const firstVariation = savedVariations[0];
      const minStockInput = firstVariation._minStockInput ?? '';
      const productData = {
        name,
        unit_id: firstVariation.unit_id,
        min_stock: parseFractionalInput((minStockInput ?? '').toString()),
        location: firstVariation.location || '',
        brand: brand || '',
        category: category || '',
        created_by: null, // Set to null if no user id
      };
      const createdProduct = await createProduct(productData);
      const prodId = createdProduct.id;
      setProductId(prodId);
      // Save all saved variations
      for (const v of savedVariations) {
        const unit = units.find(u => u.id === v.unit_id);
        const isKg = unit?.name === 'kg';
        const isL = unit?.name === 'l';
        let stockInput = '';
        let minStockInput = '';
        if (isKg) {
          stockInput = `${v._mainStock || 0} kg ${v._subStock || 0}g`;
          minStockInput = `${v._mainMinStock || 0} kg ${v._subMinStock || 0}g`;
        } else if (isL) {
          stockInput = `${v._mainStock || 0} l ${v._subStock || 0}ml`;
          minStockInput = `${v._mainMinStock || 0} l ${v._subMinStock || 0}ml`;
        } else {
          stockInput = v._stockInput ?? '';
          minStockInput = v._minStockInput ?? '';
        }
        const variantData = {
          product_id: prodId,
          name: v.name,
          unit_id: v.unit_id,
          opening_stock: parseFractionalInput((stockInput ?? '').toString()),
          current_stock: parseFractionalInput((stockInput ?? '').toString()),
          min_stock: parseFractionalInput((minStockInput ?? '').toString()),
          location: v.location || '',
          purchase_price: v.purchase_price || 0,
          selling_price: v.selling_price || 0,
          created_by: null, // Set to null if no user id
        };
        await createProductVariation(variantData);
      }
      toast.success('Product added successfully!');
      onSave && onSave({ name, brand, category, id: prodId });
    } catch (e: any) {
      setError(e.message || 'Error saving product and variations');
    }
  };

  // Update removeVariation to handle both saved and unsaved variations
  const removeSavedVariation = (idx: number) => {
    setSavedVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add edit logic
  const handleEditSavedVariation = (idx: number) => {
    setVariations((prev) => [
      ...prev.slice(0, -1), // remove the current editable input
      savedVariations[idx], // set the card to be edited
    ]);
    setSavedVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Track if there are unsaved changes
  const hasUnsaved = savedVariations.length > 0 || Object.values(variations[0] || {}).some(val => val && val !== '' && val !== 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 overflow-y-auto">
      {confirmDeleteIdx !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
            <div className="text-lg font-semibold mb-4 text-gray-900">Delete Variation?</div>
            <div className="text-gray-700 mb-6 text-center">Are you sure you want to delete this variation?</div>
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                onClick={() => {
                  if (confirmDeleteIdx !== null) removeSavedVariation(confirmDeleteIdx);
                  setConfirmDeleteIdx(null);
                }}
              >
                Delete
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                onClick={() => setConfirmDeleteIdx(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmClose && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
            <div className="text-lg font-semibold mb-4 text-gray-900">Unsaved Changes</div>
            <div className="text-gray-700 mb-6 text-center">You have unsaved products/variants. Are you sure you want to close?</div>
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                onClick={() => {
                  setConfirmClose(false);
                  onClose();
                }}
              >
                Close Without Saving
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                onClick={() => setConfirmClose(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-auto my-8">
        {/* Remove the Dynamic Header and close (X) button - no header at the top */}
        {/* (No header or close button here) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto pb-32">
          <button
            type="button"
            onClick={() => {
              if (hasUnsaved) {
                setConfirmClose(true);
                return;
              }
              onClose();
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold mb-4 text-gray-900">{t('inventory.addProduct', 'Add Product')}</h2>
          <div className="space-y-3">
            <input
              className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder={t('inventory.productName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder={t('inventory.brand', 'Brand')}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <input
              className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder={t('inventory.category', 'Category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-lg">{t('inventory.addVariation', 'Product Variations')}</h3>
              <button type="button" onClick={addVariation} className="flex items-center text-blue-600 hover:underline">
                <PlusIcon className="w-5 h-5 mr-1" /> {t('inventory.addVariation', 'Add Variation')}
              </button>
            </div>
            <div className="space-y-4">
              {/* Render saved variations as cards */}
              {savedVariations.map((v, idx) => {
                const unit = units.find(u => u.id === v.unit_id);
                let displayStock = '';
                let displayMinStock = '';
                if (unit?.name === 'kg') {
                  displayStock = parseFractionalInput(`${v._mainStock || 0} kg ${v._subStock || 0}g`).toString();
                  displayMinStock = parseFractionalInput(`${v._mainMinStock || 0} kg ${v._subMinStock || 0}g`).toString();
                } else if (unit?.name === 'l') {
                  displayStock = parseFractionalInput(`${v._mainStock || 0} l ${v._subStock || 0}ml`).toString();
                  displayMinStock = parseFractionalInput(`${v._mainMinStock || 0} l ${v._subMinStock || 0}ml`).toString();
                } else {
                  displayStock = parseFractionalInput(String(v._stockInput ?? '')).toString();
                  displayMinStock = parseFractionalInput(String(v._minStockInput ?? '')).toString();
                }
                return (
                  <div key={idx} className="border rounded p-3 relative bg-green-50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-700">
                        {unit?.name || ''} | {t('inventory.purchasePrice', 'Buy')}: {formatCurrency(v.purchase_price)} | {t('inventory.sellingPrice', 'Sell')}: {formatCurrency(v.selling_price)}<br/>
                        {t('inventory.currentStock', 'Current Stock')}: {displayStock} | {t('inventory.minStock', 'Min Stock')}: {displayMinStock}
                      </div>
                    </div>
                    <div className="flex flex-col ml-2 gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => handleEditSavedVariation(idx)}
                        className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold text-base hover:bg-blue-200 border border-blue-300 shadow-sm transition w-full"
                        title="Edit"
                      >
                        <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.293-6.293a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414L13 15H9v-4z" /></svg>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteIdx(idx)}
                        className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-lg font-semibold text-base hover:bg-red-200 border border-red-300 shadow-sm transition w-full"
                        title="Delete"
                      >
                        <TrashIcon className="w-6 h-6 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* Only render the last variation as editable fields */}
              {variations.length > 0 && (() => {
                const v = variations[variations.length - 1];
                const idx = variations.length - 1;
                const unit = units.find(u => u.id === v.unit_id);
                const isKg = unit?.name === 'kg';
                const isL = unit?.name === 'l';
                const mainStock = v._mainStock ?? '';
                const subStock = v._subStock ?? '';
                const mainMinStock = v._mainMinStock ?? '';
                const subMinStock = v._subMinStock ?? '';
                // Only require fields if any field is non-empty
                const anyFieldFilled = v.name || v.purchase_price || v.selling_price || v._stockInput || v._mainStock || v._subStock || v._minStockInput || v._mainMinStock || v._subMinStock || v.location;
                return (
                  <div key={idx} className="border rounded p-3 relative bg-gray-50">
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.variationName', 'Name')}</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                          placeholder={t('inventory.variationName', 'Name')}
                          value={v.name}
                          onChange={(e) => handleVariationChange(idx, 'name', e.target.value)}
                          required={!!anyFieldFilled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.unit', 'Unit')}</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-gray-900"
                          value={v.unit_id}
                          onChange={(e) => handleVariationChange(idx, 'unit_id', e.target.value)}
                          required={!!anyFieldFilled}
                        >
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('inventory.purchasePrice', 'Purchase Price')} / {unit?.name || ''}
                        </label>
                        <input
                          className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                          placeholder={t('inventory.purchasePrice', 'Buy') + (unit?.name ? ` / ${unit.name}` : '')}
                          type="number"
                          value={v.purchase_price}
                          onChange={(e) => handleVariationChange(idx, 'purchase_price', e.target.value)}
                          required={!!anyFieldFilled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('inventory.sellingPrice', 'Selling Price')} / {unit?.name || ''}
                        </label>
                        <input
                          className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                          placeholder={t('inventory.sellingPrice', 'Sell') + (unit?.name ? ` / ${unit.name}` : '')}
                          type="number"
                          value={v.selling_price}
                          onChange={(e) => handleVariationChange(idx, 'selling_price', e.target.value)}
                          required={!!anyFieldFilled}
                        />
                      </div>
                      {/* Current Stock */}
                      <div className={isKg || isL ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.currentStock', 'Current Stock')}</label>
                        {isKg || isL ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              type="number"
                              min="0"
                              placeholder={isKg ? 'kg' : 'l'}
                              value={mainStock}
                              onChange={e => handleVariationChange(idx, '_mainStock', e.target.value)}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{isKg ? 'kg' : 'l'}</span>
                            <input
                              className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              type="number"
                              min="0"
                              placeholder={isKg ? 'g' : 'ml'}
                              value={subStock}
                              onChange={e => handleVariationChange(idx, '_subStock', e.target.value)}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{isKg ? 'g' : 'ml'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              placeholder={t('inventory.currentStock', 'e.g. 5 pcs')}
                              value={v._stockInput}
                              pattern="[0-9kglmpcs.\s]*"
                              onChange={e => handleVariationChange(idx, '_stockInput', e.target.value.replace(/[^0-9kglmpcs.\s]/gi, ''))}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{unit?.name || ''}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {t('inventory.parsedStock', 'Parsed:')} {isNaN(parseFractionalInput((v._stockInput ?? '').toString())) ? <span className="text-red-600">Invalid</span> : parseFractionalInput((v._stockInput ?? '').toString())} {unit?.name || ''}
                        </div>
                      </div>
                      {/* Minimum Stock */}
                      <div className={isKg || isL ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.minStock', 'Minimum Stock')}</label>
                        {isKg || isL ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              type="number"
                              min="0"
                              placeholder={isKg ? 'kg' : 'l'}
                              value={mainMinStock}
                              onChange={e => handleVariationChange(idx, '_mainMinStock', e.target.value)}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{isKg ? 'kg' : 'l'}</span>
                            <input
                              className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              type="number"
                              min="0"
                              placeholder={isKg ? 'g' : 'ml'}
                              value={subMinStock}
                              onChange={e => handleVariationChange(idx, '_subMinStock', e.target.value)}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{isKg ? 'g' : 'ml'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                              placeholder={t('inventory.minStock', 'e.g. 2 pcs')}
                              value={v._minStockInput}
                              pattern="[0-9kglmpcs.\s]*"
                              onChange={e => handleVariationChange(idx, '_minStockInput', e.target.value.replace(/[^0-9kglmpcs.\s]/gi, ''))}
                              required={!!anyFieldFilled}
                            />
                            <span className="text-gray-700 text-sm">{unit?.name || ''}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {t('inventory.parsedStock', 'Parsed:')} {isNaN(parseFractionalInput((v._minStockInput ?? '').toString())) ? <span className="text-red-600">Invalid</span> : parseFractionalInput((v._minStockInput ?? '').toString())} {unit?.name || ''}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.location', 'Location')}</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                          placeholder={t('inventory.location', 'Location')}
                          value={v.location}
                          onChange={(e) => handleVariationChange(idx, 'location', e.target.value)}
                          required={!!anyFieldFilled}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-700 mt-2">
                      {t('inventory.totalPurchaseValue', 'Total Purchase Value')}: {formatCurrency(v.purchase_price * parseFractionalInput((v._stockInput ?? '').toString()))}
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-700 mt-1">
                      {t('inventory.estimatedRevenue', 'Estimated Revenue')}: {formatCurrency(v.selling_price * parseFractionalInput((v._stockInput ?? '').toString()))}
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-700 mt-1">
                      {t('inventory.estimatedProfit', 'Estimated Profit')}: {formatCurrency((v.selling_price - v.purchase_price) * parseFractionalInput((v._stockInput ?? '').toString()))}
                    </div>
                    <div className="col-span-2 flex justify-end mt-2">
                      <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-1 rounded-lg font-medium hover:bg-blue-700 text-sm mr-2"
                        onClick={() => handleSaveVariant(v, idx)}
                        disabled={loadingIdx === idx}
                      >
                        {loadingIdx === idx ? t('common.loading', 'Adding...') : t('common.add', 'Add')}
                      </button>
                      <button type="button" onClick={() => removeVariation(idx)} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                    {error && loadingIdx === idx && (
                      <div className="text-red-600 text-xs mt-2">{error}</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="w-full flex justify-center mt-8 mb-4">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg w-full"
              style={{ maxWidth: '24rem' }}
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 