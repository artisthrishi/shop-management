// ============================================================================
// Context: Shop Manager MVP - ProductForm for adding/editing products & variations
// ============================================================================
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getUnits, createProduct, createProductVariation } from '@/lib/database';
import type { ProductVariationFormData, Unit } from '@/types';
import { parseFractionalInput, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// Remove local ProductFormData and Variation interfaces, use imported ones
// Define ProductFormData type for form submission
// interface ProductFormData {
//   name: string;
//   brand: string;
//   category: string;
//   variations: Variation[];
//   id?: number;
// }

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: { name: string; brand: string; category: string; created_by: string | null }) => void;
  initialData?: { name?: string; brand?: string; category?: string; created_by?: string | null; variations?: ProductVariationFormData[] };
}

// Local UI type for form state
interface VariationUI {
  name: string;
  unit_id: number;
  purchase_price: number;
  selling_price: number;
  opening_stock: number;
  min_stock: number;
  location: string;
  _stockInput?: string;
  _minStockInput?: string;
  _mainStock?: string;
  _subStock?: string;
  _mainMinStock?: string;
  _subMinStock?: string;
}

// Add validation state interfaces
interface ValidationErrors {
  product?: {
    name?: string;
  };
  variations?: {
    [index: number]: {
      name?: string;
      unit_id?: string;
      purchase_price?: string;
      selling_price?: string;
      opening_stock?: string;
      min_stock?: string;
      location?: string;
    };
  };
}

export default function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
  const { t } = useTranslation();
  // Map initialData.variations or product_variations to Variation[] for editing
  const mapInitialVariations = (data: { name?: string; brand?: string; category?: string; created_by?: string | null; variations?: ProductVariationFormData[] } | undefined): VariationUI[] => {
    if (!data || !data.variations) return [
      { 
        name: '', 
        unit_id: 1, 
        purchase_price: 0, 
        selling_price: 0, 
        opening_stock: 0, 
        min_stock: 0, 
        location: '',
        // Initialize UI state fields
        _stockInput: '',
        _minStockInput: '',
        _mainStock: '',
        _subStock: '',
        _mainMinStock: '',
        _subMinStock: '',
      },
    ];
    const variations = data.variations;
    return variations.map((v: ProductVariationFormData) => ({
      name: v.name || '',
      unit_id: v.unit_id || 1,
      purchase_price: v.purchase_price || 0,
      selling_price: v.selling_price || 0,
      opening_stock: v.opening_stock || 0,
      min_stock: v.min_stock || 0,
      location: v.location || '',
      _stockInput: v.opening_stock?.toString() ?? '',
      _minStockInput: v.min_stock?.toString() ?? '',
    }));
  };

  const [name, setName] = useState(initialData?.name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [category, setCategory] = useState(initialData?.category || '');
  // Use ProductVariationFormData for all variation state
  const [variations, setVariations] = useState<VariationUI[]>(mapInitialVariations(initialData));
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  // Add a new state to track saved variations
  const [savedVariations, setSavedVariations] = useState<VariationUI[]>([]);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isAddingVariation, setIsAddingVariation] = useState(!initialData?.variations?.length);

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
    }
  }, [initialData]);

  const handleVariationChange = (idx: number, field: keyof VariationUI, value: string | number) => {
    setVariations((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, [field]: field === 'name' || field === 'location' ? value : Number(value) } : v
      )
    );
  };

  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      { 
        name: '', 
        unit_id: units[0]?.id || 1, 
        purchase_price: 0, 
        selling_price: 0, 
        opening_stock: 0, 
        min_stock: 0, 
        location: '',
        // Initialize UI state fields
        _stockInput: '',
        _minStockInput: '',
        _mainStock: '',
        _subStock: '',
        _mainMinStock: '',
        _subMinStock: '',
      },
    ]);
    setIsAddingVariation(true);
  };

  const removeVariation = (idx: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Validation functions
  const validateProductName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Product name is required';
    }
    if (name.trim().length < 2) {
      return 'Product name must be at least 2 characters';
    }
    return undefined;
  };

  const validateVariation = (variation: VariationUI, index: number) => {
    const errors: {
      name?: string;
      unit_id?: string;
      purchase_price?: string;
      selling_price?: string;
      opening_stock?: string;
      min_stock?: string;
      location?: string;
    } = {};

    // Validate variation name
    if (!variation.name.trim()) {
      errors.name = 'Variation name is required';
    } else if (variation.name.trim().length < 2) {
      errors.name = 'Variation name must be at least 2 characters';
    }

    // Validate unit
    if (!variation.unit_id || variation.unit_id <= 0) {
      errors.unit_id = 'Please select a unit';
    }

    // Validate purchase price
    if (variation.purchase_price <= 0) {
      errors.purchase_price = 'Purchase price must be greater than 0';
    }

    // Validate selling price
    if (variation.selling_price <= 0) {
      errors.selling_price = 'Selling price must be greater than 0';
    }

    // Validate opening stock
    const selectedUnit = units.find(u => u.id === variation.unit_id);
    if (selectedUnit?.subunit_name && selectedUnit?.subunit_factor) {
      // For units with subunits, check if at least one field has a value
      const mainStock = parseFloat(variation._mainStock ?? '0');
      const subStock = parseFloat(variation._subStock ?? '0');
      if (mainStock <= 0 && subStock <= 0) {
        errors.opening_stock = 'Opening stock is required';
      }
    } else {
      // For units without subunits
      const stockValue = parseFloat(variation._stockInput ?? '0');
      if (stockValue <= 0) {
        errors.opening_stock = 'Opening stock is required';
      }
    }

    // Validate min stock
    if (selectedUnit?.subunit_name && selectedUnit?.subunit_factor) {
      const mainMinStock = parseFloat(variation._mainMinStock ?? '0');
      const subMinStock = parseFloat(variation._subMinStock ?? '0');
      if (mainMinStock <= 0 && subMinStock <= 0) {
        errors.min_stock = 'Minimum stock is required';
      }
    } else {
      const minStockValue = parseFloat(variation._minStockInput ?? '0');
      if (minStockValue <= 0) {
        errors.min_stock = 'Minimum stock is required';
      }
    }

    // Location is optional, so no validation needed

    return errors;
  };

  const validateAllVariations = (): boolean => {
    const newValidationErrors: ValidationErrors = {
      product: {},
      variations: {}
    };

    // Validate product name
    const productNameError = validateProductName(name);
    if (productNameError) {
      newValidationErrors.product!.name = productNameError;
    }

    // Validate all variations
    let hasVariationErrors = false;
    variations.forEach((variation, index) => {
      const variationErrors = validateVariation(variation, index);
      if (Object.keys(variationErrors).length > 0) {
        newValidationErrors.variations![index] = variationErrors;
        hasVariationErrors = true;
      }
    });

    setValidationErrors(newValidationErrors);

    // Check if there are any errors
    const hasProductErrors = newValidationErrors.product && Object.keys(newValidationErrors.product).length > 0;
    return !hasProductErrors && !hasVariationErrors;
  };

  // Update handleSaveVariant with validation
  const handleSaveVariant = (v: VariationUI, idx: number) => {
    // Validate the variation before saving
    const variationErrors = validateVariation(v, idx);
    
    if (Object.keys(variationErrors).length > 0) {
      setValidationErrors(prev => ({
        ...prev,
        variations: {
          ...prev.variations,
          [idx]: variationErrors
        }
      }));
      toast.error('Please fix all errors before saving this variation');
      return;
    }

    // Clear validation errors for this variation
    setValidationErrors(prev => {
      const newVariations = { ...prev.variations };
      delete newVariations[idx];
      return {
        ...prev,
        variations: newVariations
      };
    });

    // Move the saved variation to savedVariations
    setSavedVariations(prev => [...prev, v]);
    // Remove the saved variation from variations and add a new empty one with UI state fields
    setVariations((prev) => [
      ...prev.slice(0, idx),
      ...prev.slice(idx + 1),
      { 
        name: '', 
        unit_id: units[0]?.id || 1, 
        purchase_price: 0, 
        selling_price: 0, 
        opening_stock: 0, 
        min_stock: 0, 
        location: '',
        // Initialize UI state fields
        _stockInput: '',
        _minStockInput: '',
        _mainStock: '',
        _subStock: '',
        _mainMinStock: '',
        _subMinStock: '',
      },
    ]);
    
    // Reset the adding state
    setIsAddingVariation(false);
    
    toast.success('Variation saved successfully!');
  };

  // When saving, map UI state to strict ProductVariationFormData[]
  const toStrictVariation = (v: VariationUI): ProductVariationFormData => ({
    name: v.name,
    unit_id: v.unit_id,
    purchase_price: v.purchase_price,
    selling_price: v.selling_price,
    opening_stock: parseFractionalInput((v._stockInput ?? v.opening_stock?.toString() ?? '0').toString()),
    min_stock: parseFractionalInput((v._minStockInput ?? v.min_stock?.toString() ?? '0').toString()),
    location: v.location,
  });

  // Update handleSubmit with comprehensive validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate everything before proceeding
    if (!validateAllVariations()) {
      setError('Please fix all validation errors before saving the product');
      toast.error('Please fix all validation errors before saving the product');
      return;
    }

    if (savedVariations.length === 0) {
      setError('Please add at least one product variation before saving.');
      toast.error('Please add at least one product variation before saving.');
      return;
    }

    try {
      // Save the product first
      const productInsert = {
        name,
        brand: brand || '',
        category: category || '',
        created_by: null, // or set to the current user if available
      };
      const createdProduct = await createProduct(productInsert);
      const prodId = createdProduct.id;
      // Save all saved variations
      for (const v of savedVariations) {
        const unit = units.find(u => u.id === v.unit_id);
        const isKg = unit?.subunit_name && unit?.subunit_factor;
        let stockInput = '';
        let minStockInput = '';
        if (isKg) {
          stockInput = `${v._mainStock || 0} ${v._subStock || 0}`;
          minStockInput = `${v._mainMinStock || 0} ${v._subMinStock || 0}`;
        } else {
          stockInput = v._stockInput ?? '';
          minStockInput = v._minStockInput ?? '';
        }
        const variantData = {
          product_id: prodId,
          name: v.name,
          unit_id: v.unit_id,
          opening_stock: parseFractionalInput((stockInput ?? '').toString(), unit?.subunit_factor),
          current_stock: parseFractionalInput((stockInput ?? '').toString(), unit?.subunit_factor),
          min_stock: parseFractionalInput((minStockInput ?? '').toString(), unit?.subunit_factor),
          location: v.location || '',
          purchase_price: v.purchase_price || 0,
          selling_price: v.selling_price || 0,
          created_by: null, // Set to null if no user id
        };
        await createProductVariation(variantData);
      }
      toast.success('Product added successfully!');
      onSave && onSave(productInsert);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving product and variations');
      toast.error(e instanceof Error ? e.message : 'Error saving product and variations');
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
            <div>
              <input
                className={`w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500 ${
                  validationErrors.product?.name ? 'border-red-500' : ''
                }`}
                placeholder={t('inventory.productName')}
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                suppressHydrationWarning
              />
              {validationErrors.product?.name && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.product.name}</p>
              )}
            </div>
            <input
              className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder={t('inventory.brand', 'Brand')}
              value={brand}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrand(e.target.value)}
              suppressHydrationWarning
            />
            <input
              className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder={t('inventory.category', 'Category')}
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
              suppressHydrationWarning
            />
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-lg">{t('inventory.addVariation', 'Product Variations')}</h3>
              <button 
                type="button" 
                onClick={addVariation} 
                disabled={isAddingVariation}
                className={`flex items-center ${
                  isAddingVariation 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-blue-600 hover:underline'
                }`}
              >
                <PlusIcon className="w-5 h-5 mr-1" /> {t('inventory.addVariation', 'Add Variation')}
              </button>
            </div>
            <div className="space-y-4">
              {/* Add New Variation Form */}
              {isAddingVariation && (() => {
                const v = variations[variations.length - 1];
                const idx = variations.length - 1;
                const unit = units.find(u => u.id === v.unit_id);
                const selectedUnit = unit || { name: '', subunit_name: '', subunit_factor: 1 };
                const isKg = selectedUnit.subunit_name && selectedUnit.subunit_factor;
                
                return (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 mb-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-blue-900">Add New Variation</h3>
                      <button 
                        onClick={() => {
                          setVariations(prev => prev.filter((_, i) => i !== prev.length - 1));
                          setIsAddingVariation(false);
                        }} 
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.variationName', 'Name')}</label>
                        <input
                          className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.variations?.[idx]?.name ? 'border-red-500' : ''
                          }`}
                          placeholder={t('inventory.variationName', 'Name')}
                          value={v.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, 'name', e.target.value)}
                        />
                        {validationErrors.variations?.[idx]?.name && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.unit', 'Unit')}</label>
                        <select
                          className={`w-full border rounded px-2 py-1 text-gray-900 ${
                            validationErrors.variations?.[idx]?.unit_id ? 'border-red-500' : ''
                          }`}
                          value={v.unit_id}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleVariationChange(idx, 'unit_id', Number(e.target.value))}
                        >
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}{unit.full_name ? ` (${unit.full_name})` : ''}
                            </option>
                          ))}
                        </select>
                        {validationErrors.variations?.[idx]?.unit_id && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].unit_id}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.purchasePrice', 'Purchase Price')}</label>
                        <input
                          className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.variations?.[idx]?.purchase_price ? 'border-red-500' : ''
                          }`}
                          type="number"
                          placeholder={t('inventory.purchasePrice', 'Purchase Price')}
                          value={v.purchase_price || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, 'purchase_price', Number(e.target.value))}
                        />
                        {validationErrors.variations?.[idx]?.purchase_price && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].purchase_price}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.sellingPrice', 'Selling Price')}</label>
                        <input
                          className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.variations?.[idx]?.selling_price ? 'border-red-500' : ''
                          }`}
                          type="number"
                          placeholder={t('inventory.sellingPrice', 'Selling Price')}
                          value={v.selling_price || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, 'selling_price', Number(e.target.value))}
                        />
                        {validationErrors.variations?.[idx]?.selling_price && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].selling_price}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.openingStock', 'Opening Stock')}</label>
                        {isKg ? (
                          <div className="flex items-center gap-2">
                            <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.opening_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.name}
                              value={v._mainStock ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_mainStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                            <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                            <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.opening_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.subunit_name}
                              value={v._subStock ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_subStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                            <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                          </div>
                        ) : (
                            <input
                              className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.opening_stock ? 'border-red-500' : ''
                              }`}
                            type="number"
                            min="0"
                            placeholder="Enter opening stock"
                              value={v._stockInput ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_stockInput', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Parsed: {(() => {
                            if (isKg) {
                              const parsed = parseFractionalInput(`${v._mainStock || 0} ${v._subStock || 0}`, selectedUnit.subunit_factor);
                              return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                            } else {
                              const parsed = parseFractionalInput((v._stockInput ?? '').toString());
                              return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                            }
                          })()} {selectedUnit.name}
                        </div>
                        {validationErrors.variations?.[idx]?.opening_stock && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].opening_stock}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.minStock', 'Min Stock')}</label>
                        {isKg ? (
                          <div className="flex items-center gap-2">
                            <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.min_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.name}
                              value={v._mainMinStock ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_mainMinStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                            <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                            <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.min_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.subunit_name}
                              value={v._subMinStock ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_subMinStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                            <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                          </div>
                        ) : (
                            <input
                              className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.variations?.[idx]?.min_stock ? 'border-red-500' : ''
                              }`}
                            type="number"
                            min="0"
                            placeholder="Enter min stock"
                              value={v._minStockInput ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, '_minStockInput', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Parsed: {(() => {
                            if (isKg) {
                              const parsed = parseFractionalInput(`${v._mainMinStock || 0} ${v._subMinStock || 0}`, selectedUnit.subunit_factor);
                              return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                            } else {
                              const parsed = parseFractionalInput((v._minStockInput ?? '').toString());
                              return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                            }
                          })()} {selectedUnit.name}
                        </div>
                        {validationErrors.variations?.[idx]?.min_stock && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].min_stock}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('inventory.location', 'Location')}</label>
                        <input
                          className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.variations?.[idx]?.location ? 'border-red-500' : ''
                          }`}
                          placeholder={t('inventory.location', 'Location')}
                          value={v.location}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariationChange(idx, 'location', e.target.value)}
                        />
                        {validationErrors.variations?.[idx]?.location && (
                          <p className="text-red-600 text-xs mt-1">{validationErrors.variations[idx].location}</p>
                        )}
                      </div>
                      <div className="col-span-2 flex justify-end gap-2 mt-2">
                        <button 
                          type="button"
                          onClick={() => {
                            const errors = validateVariation(v, idx);
                            if (Object.keys(errors).length === 0) {
                              // Move the saved variation to savedVariations
                              setSavedVariations(prev => [...prev, v]);
                              // Remove the current variation (don't add a new empty one)
                              setVariations((prev) => prev.filter((_, i) => i !== idx));
                              // Set isAddingVariation to false so the form disappears
                              setIsAddingVariation(false);
                              toast.success('Variation saved successfully!');
                            } else {
                              setValidationErrors(prev => ({
                                ...prev,
                                variations: { ...prev.variations, [idx]: errors }
                              }));
                            }
                          }} 
                          className="bg-blue-600 text-white px-4 py-1 rounded-lg font-medium hover:bg-blue-700 text-sm"
                        >
                          Add Variation
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setVariations(prev => prev.filter((_, i) => i !== prev.length - 1));
                            setIsAddingVariation(false);
                          }} 
                          className="text-gray-500 hover:text-gray-700 px-4 py-1 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    </div>
                );
              })()}
              
              {/* Render saved variations as cards */}
              {savedVariations.map((v, idx) => {
                const unit = units.find(u => u.id === v.unit_id);
                let displayStock = '';
                let displayMinStock = '';
                const isKg = unit?.subunit_name && unit?.subunit_factor;
                if (isKg) {
                  displayStock = parseFractionalInput(`${v._mainStock || 0} ${v._subStock || 0}`, unit.subunit_factor).toString();
                  displayMinStock = parseFractionalInput(`${v._mainMinStock || 0} ${v._subMinStock || 0}`, unit.subunit_factor).toString();
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
              {/* Only render the last variation as editable fields when not adding a new variation */}
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