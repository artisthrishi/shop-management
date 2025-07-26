"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getProductWithVariations, getUnits, createProductVariation, updateProductVariation, deleteProductVariation } from '@/lib/database';
import type { Product, ProductVariation, Unit } from '@/types';
import { formatCurrency, parseFractionalInput } from '@/lib/utils';
import toast from 'react-hot-toast';
import { TrashIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Local UI type for form state
interface EditVariationUI extends Partial<ProductVariation> {
  _stockInput?: string;
  _minStockInput?: string;
  _mainStock?: string;
  _subStock?: string;
  _mainMinStock?: string;
  _subMinStock?: string;
}

export default function ProductDetailsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const productId = Number(params?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVariation, setEditVariation] = useState<EditVariationUI | null>(null);
  const [pendingVariations, setPendingVariations] = useState<EditVariationUI[]>([]);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation functions
  const validateVariation = (variation: EditVariationUI) => {
    const errors: {[key: string]: string} = {};
    const unit = units.find(u => u.id === variation.unit_id);
    
    // Validate variation name
    if (!variation.name?.trim()) {
      errors.name = 'Variation name is required';
    } else if (variation.name.trim().length < 2) {
      errors.name = 'Variation name must be at least 2 characters';
    }

    // Validate unit
    if (!variation.unit_id || variation.unit_id <= 0) {
      errors.unit_id = 'Please select a unit';
    }

    // Validate purchase price
    if (!variation.purchase_price || variation.purchase_price <= 0) {
      errors.purchase_price = 'Purchase price must be greater than 0';
    }

    // Validate selling price
    if (!variation.selling_price || variation.selling_price <= 0) {
      errors.selling_price = 'Selling price must be greater than 0';
    }

    // Validate stock inputs
    if (unit?.subunit_name && unit?.subunit_factor) {
      // For units with subunits
      const mainStock = parseFloat(variation._mainStock ?? '0');
      const subStock = parseFloat(variation._subStock ?? '0');
      if (mainStock <= 0 && subStock <= 0) {
        errors.current_stock = 'Current stock is required';
      }
      
      const mainMinStock = parseFloat(variation._mainMinStock ?? '0');
      const subMinStock = parseFloat(variation._subMinStock ?? '0');
      if (mainMinStock <= 0 && subMinStock <= 0) {
        errors.min_stock = 'Minimum stock is required';
      }
    } else {
      // For units without subunits
      const stockValue = parseFloat(variation._stockInput ?? '0');
      if (stockValue <= 0) {
        errors.current_stock = 'Current stock is required';
      }
      
      const minStockValue = parseFloat(variation._minStockInput ?? '0');
      if (minStockValue <= 0) {
        errors.min_stock = 'Minimum stock is required';
      }
    }

    // Location is optional, so no validation needed

    return errors;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getProductWithVariations(productId),
      getUnits()
    ])
      .then(([prod, units]) => {
        setProduct(prod);
        setUnits(units);
        setPendingVariations(prod.product_variations || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error loading product');
        setLoading(false);
      });
  }, [productId]);

  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    const variation = pendingVariations[idx];
    const unit = units.find(u => u.id === variation.unit_id);
    
    // Initialize UI state based on unit type
    if (unit?.subunit_name && unit?.subunit_factor) {
      // For units with subunits, convert stored value to UI state
      const totalStock = variation.current_stock || 0;
      const mainStock = Math.floor(totalStock);
      const subStock = Math.round((totalStock - mainStock) * unit.subunit_factor);
      
      const totalMinStock = variation.min_stock || 0;
      const mainMinStock = Math.floor(totalMinStock);
      const subMinStock = Math.round((totalMinStock - mainMinStock) * unit.subunit_factor);
      
      setEditVariation({
        ...variation,
        _mainStock: mainStock.toString(),
        _subStock: subStock.toString(),
        _mainMinStock: mainMinStock.toString(),
        _subMinStock: subMinStock.toString(),
      });
    } else {
      // For units without subunits
      setEditVariation({
        ...variation,
        _stockInput: (variation.current_stock || 0).toString(),
        _minStockInput: (variation.min_stock || 0).toString(),
      });
    }
  };

  const handleEditChange = (field: string, value: unknown) => {
    setEditVariation((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleEditSave = async (idx: number) => {
    setSaveLoading(true);
    const v = editVariation;
    
    if (!v) {
      setError('No variation data to save');
      setSaveLoading(false);
      return;
    }

    // Validate the variation before saving
    const errors = validateVariation(v);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSaveLoading(false);
      return;
    }

    // Clear validation errors
    setValidationErrors({});
    
    const unit = units.find(u => u.id === v.unit_id);
    
    try {
      // Parse stock values using fractional input
      let currentStock = v?.current_stock || 0;
      let minStock = v?.min_stock || 0;
      
      if (unit?.subunit_name && unit?.subunit_factor) {
        // For units with subunits
        if (v?._mainStock !== undefined || v?._subStock !== undefined) {
          const stockInput = `${v?._mainStock || 0} ${v?._subStock || 0}`;
          currentStock = parseFractionalInput(stockInput, unit.subunit_factor);
        }
        if (v?._mainMinStock !== undefined || v?._subMinStock !== undefined) {
          const minStockInput = `${v?._mainMinStock || 0} ${v?._subMinStock || 0}`;
          minStock = parseFractionalInput(minStockInput, unit.subunit_factor);
        }
      } else {
        // For units without subunits
        if (v?._stockInput !== undefined) {
          currentStock = parseFractionalInput((v?._stockInput ?? '').toString());
        }
        if (v?._minStockInput !== undefined) {
          minStock = parseFractionalInput((v?._minStockInput ?? '').toString());
        }
      }
      
      // Filter out UI state fields before saving to database
      const { 
        _stockInput, 
        _minStockInput, 
        _mainStock, 
        _subStock, 
        _mainMinStock, 
        _subMinStock,
        ...databaseData 
      } = v || {};
      
      const variationData = {
        ...databaseData,
        current_stock: currentStock,
        min_stock: minStock,
      };
      
      if (v && v.id) {
        await updateProductVariation(v.id, variationData as ProductVariation);
      } else if (v) {
        await createProductVariation({ ...variationData, product_id: productId } as Omit<ProductVariation, 'id'>);
      }
      setPendingVariations((prev) => prev.map((pv, i) => (i === idx ? { ...variationData } : pv)));
      setEditIdx(null);
      setEditVariation(null);
      // Refresh product data
      const prod = await getProductWithVariations(productId);
      setProduct(prod);
      setPendingVariations(prod.product_variations || []);
      toast.success('Variation saved successfully!');
    } catch (e) {
      console.error('Save error details:', e);
      setError(e instanceof Error ? e.message : 'Error saving variation');
    }
    setSaveLoading(false);
  };

  const handleDelete = (idx: number) => {
    setDeleteIdx(idx);
  };

  const confirmDelete = async () => {
    setSaveLoading(true);
    try {
      if (deleteIdx !== null) {
        const v = pendingVariations[deleteIdx];
        if (v.id) {
          await deleteProductVariation(v.id);
        }
        setPendingVariations((prev) => prev.filter((_, i) => i !== deleteIdx));
        setDeleteIdx(null);
        setEditIdx(null);
        setEditVariation(null);
        // Refresh product data
        const prod = await getProductWithVariations(productId);
        setProduct(prod);
        setPendingVariations(prod.product_variations || []);
        toast.success('Variation deleted successfully!');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting variation');
    }
    setSaveLoading(false);
  };

  const handleAddVariation = () => {
    const newVariation: EditVariationUI = {
      name: '',
      unit_id: units[0]?.id || 1,
      purchase_price: 0,
      selling_price: 0,
      opening_stock: 0,
      current_stock: 0,
      min_stock: 0,
      location: '',
      product_id: productId,
      created_by: null,
      // Initialize UI state fields
      _stockInput: '',
      _minStockInput: '',
      _mainStock: '',
      _subStock: '',
      _mainMinStock: '',
      _subMinStock: '',
    };
    setPendingVariations((prev) => [...prev, newVariation]);
    setEditIdx(-1); // Use -1 to indicate adding a new variation
    setEditVariation(newVariation);
  };

  const handleSaveAll = async () => {
    setSaveLoading(true);
    try {
      for (const v of pendingVariations) {
        const unit = units.find(u => u.id === v.unit_id);
        
        // Parse stock values using fractional input
        let currentStock = v.current_stock || 0;
        let minStock = v.min_stock || 0;
        
        // Only parse if UI state fields exist (meaning the variation was edited)
        if (unit?.subunit_name && unit?.subunit_factor) {
          if (v._mainStock !== undefined || v._subStock !== undefined) {
            const stockInput = `${v._mainStock || 0} ${v._subStock || 0}`;
            currentStock = parseFractionalInput(stockInput, unit.subunit_factor);
          }
          if (v._mainMinStock !== undefined || v._subMinStock !== undefined) {
            const minStockInput = `${v._mainMinStock || 0} ${v._subMinStock || 0}`;
            minStock = parseFractionalInput(minStockInput, unit.subunit_factor);
          }
        } else {
          if (v._stockInput !== undefined) {
            currentStock = parseFractionalInput((v._stockInput ?? '').toString());
          }
          if (v._minStockInput !== undefined) {
            minStock = parseFractionalInput((v._minStockInput ?? '').toString());
          }
        }
        
        // Filter out UI state fields before saving to database
        const { 
          _stockInput, 
          _minStockInput, 
          _mainStock, 
          _subStock, 
          _mainMinStock, 
          _subMinStock,
          ...databaseData 
        } = v;
        
        const variationData = {
          ...databaseData,
          current_stock: currentStock,
          min_stock: minStock,
        };
        
        if (v && v.id) {
          await updateProductVariation(v.id, variationData as ProductVariation);
        } else if (v) {
          await createProductVariation({ ...variationData, product_id: productId } as Omit<ProductVariation, 'id'>);
        }
      }
      // Refresh product data
      const prod = await getProductWithVariations(productId);
      setProduct(prod);
      setPendingVariations(prod.product_variations || []);
      router.push('/inventory');
      toast.success('All variations saved successfully!');
    } catch (e) {
      console.error('Save all error details:', e);
      setError(e instanceof Error ? e.message : 'Error saving changes');
    }
    setSaveLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!product) return <div className="p-8 text-center text-gray-500">Product not found.</div>;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 relative">
      <button
        className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100"
        onClick={() => router.push('/inventory')}
        title="Close"
      >
        <XMarkIcon className="w-6 h-6 text-gray-500" />
      </button>
      <div className="text-2xl font-bold text-gray-900 mb-2">Product Details</div>
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="font-semibold text-lg text-gray-900">{product.name}</div>
        <div className="text-sm text-gray-500">Brand: {product.brand}</div>
        <div className="text-sm text-gray-500">Category: {product.category}</div>
        {/* <div className="text-sm text-gray-500">Location: {product.location}</div> */}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-900">Variations</div>
          <button 
            onClick={handleAddVariation} 
            disabled={editIdx !== null}
            className={`flex items-center text-sm font-medium ${
              editIdx !== null 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:underline'
            }`}
          >
            <PlusIcon className="w-5 h-5 mr-1" /> Add Variation
          </button>
        </div>
        
        {/* Add New Variation Form */}
        {editIdx === -1 && (
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 mb-4 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">Add New Variation</h3>
              <button 
                onClick={() => {
                  setPendingVariations(prev => prev.filter((_, i) => i !== prev.length - 1));
                  setEditIdx(null);
                  setEditVariation(null);
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input 
                  className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                    validationErrors.name ? 'border-red-500' : ''
                  }`}
                  value={editVariation?.name ?? ''} 
                  onChange={e => handleEditChange('name', e.target.value)} 
                />
                {validationErrors.name && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <select 
                  className={`w-full border rounded px-2 py-1 text-gray-900 ${
                    validationErrors.unit_id ? 'border-red-500' : ''
                  }`}
                  value={editVariation?.unit_id ?? 0} 
                  onChange={e => handleEditChange('unit_id', Number(e.target.value))}
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}{unit.full_name ? ` (${unit.full_name})` : ''}
                    </option>
                  ))}
                </select>
                {validationErrors.unit_id && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.unit_id}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
                <input 
                  className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                    validationErrors.purchase_price ? 'border-red-500' : ''
                  }`}
                  type="number" 
                  value={editVariation?.purchase_price ?? ''} 
                  onChange={e => handleEditChange('purchase_price', Number(e.target.value))} 
                />
                {validationErrors.purchase_price && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.purchase_price}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price</label>
                <input 
                  className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                    validationErrors.selling_price ? 'border-red-500' : ''
                  }`}
                  type="number" 
                  value={editVariation?.selling_price ?? ''} 
                  onChange={e => handleEditChange('selling_price', Number(e.target.value))} 
                />
                {validationErrors.selling_price && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.selling_price}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Stock</label>
                {(() => {
                  const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                  const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                  
                  if (isKg) {
                    return (
                      <div className="flex items-center gap-2">
                        <input
                          className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.current_stock ? 'border-red-500' : ''
                          }`}
                          type="number"
                          min="0"
                          placeholder={selectedUnit.name}
                          value={editVariation?._mainStock ?? ''}
                          onChange={e => handleEditChange('_mainStock', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                        />
                        <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                        <input
                          className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.current_stock ? 'border-red-500' : ''
                          }`}
                          type="number"
                          min="0"
                          placeholder={selectedUnit.subunit_name}
                          value={editVariation?._subStock ?? ''}
                          onChange={e => handleEditChange('_subStock', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                        />
                        <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                      </div>
                    );
                  } else {
                    return (
                      <input
                        className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                          validationErrors.current_stock ? 'border-red-500' : ''
                        }`}
                        type="number"
                        min="0"
                        placeholder="Enter stock"
                        value={editVariation?._stockInput ?? ''}
                        onChange={e => handleEditChange('_stockInput', e.target.value)}
                        onWheel={e => e.currentTarget.blur()}
                      />
                    );
                  }
                })()}
                <div className="text-xs text-gray-500 mt-1">
                  Parsed: {(() => {
                    const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                    const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                    
                    if (isKg) {
                      const parsed = parseFractionalInput(`${editVariation?._mainStock || 0} ${editVariation?._subStock || 0}`, selectedUnit?.subunit_factor);
                      return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                    } else {
                      const parsed = parseFractionalInput((editVariation?._stockInput ?? '').toString());
                      return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                    }
                  })()} {units.find(u => u.id === editVariation?.unit_id)?.name || ''}
                </div>
                {validationErrors.current_stock && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.current_stock}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label>
                {(() => {
                  const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                  const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                  
                  if (isKg) {
                    return (
                      <div className="flex items-center gap-2">
                        <input
                          className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.min_stock ? 'border-red-500' : ''
                          }`}
                          type="number"
                          min="0"
                          placeholder={selectedUnit.name}
                          value={editVariation?._mainMinStock ?? ''}
                          onChange={e => handleEditChange('_mainMinStock', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                        />
                        <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                        <input
                          className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                            validationErrors.min_stock ? 'border-red-500' : ''
                          }`}
                          type="number"
                          min="0"
                          placeholder={selectedUnit.subunit_name}
                          value={editVariation?._subMinStock ?? ''}
                          onChange={e => handleEditChange('_subMinStock', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                        />
                        <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                      </div>
                    );
                  } else {
                    return (
                      <input
                        className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                          validationErrors.min_stock ? 'border-red-500' : ''
                        }`}
                        type="number"
                        min="0"
                        placeholder="Enter min stock"
                        value={editVariation?._minStockInput ?? ''}
                        onChange={e => handleEditChange('_minStockInput', e.target.value)}
                        onWheel={e => e.currentTarget.blur()}
                      />
                    );
                  }
                })()}
                <div className="text-xs text-gray-500 mt-1">
                  Parsed: {(() => {
                    const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                    const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                    
                    if (isKg) {
                      const parsed = parseFractionalInput(`${editVariation?._mainMinStock || 0} ${editVariation?._subMinStock || 0}`, selectedUnit?.subunit_factor);
                      return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                    } else {
                      const parsed = parseFractionalInput((editVariation?._minStockInput ?? '').toString());
                      return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                    }
                  })()} {units.find(u => u.id === editVariation?.unit_id)?.name || ''}
                </div>
                {validationErrors.min_stock && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.min_stock}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input 
                  className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                    validationErrors.location ? 'border-red-500' : ''
                  }`}
                  value={editVariation?.location ?? ''} 
                  onChange={e => handleEditChange('location', e.target.value)} 
                />
                {validationErrors.location && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.location}</p>
                )}
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button onClick={() => handleEditSave(pendingVariations.length - 1)} className="bg-blue-600 text-white px-4 py-1 rounded-lg font-medium hover:bg-blue-700 text-sm">Add Variation</button>
                <button onClick={() => {
                  setPendingVariations(prev => prev.filter((_, i) => i !== prev.length - 1));
                  setEditIdx(null);
                  setEditVariation(null);
                }} className="text-gray-500 hover:text-gray-700 px-4 py-1 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Existing Variations */}
        {pendingVariations.length === 0 && editIdx === null && <div className="text-gray-500">No variations found.</div>}
        {pendingVariations.map((v, idx) => (
          <div key={idx} className="border rounded p-3 mb-3 bg-gray-50">
            {editIdx === idx && editIdx < pendingVariations.length ? (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                      validationErrors.name ? 'border-red-500' : ''
                    }`}
                    value={editVariation?.name ?? ''} 
                    onChange={e => handleEditChange('name', e.target.value)} 
                  />
                  {validationErrors.name && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select 
                    className={`w-full border rounded px-2 py-1 text-gray-900 ${
                      validationErrors.unit_id ? 'border-red-500' : ''
                    }`}
                    value={editVariation?.unit_id ?? 0} 
                    onChange={e => handleEditChange('unit_id', Number(e.target.value))}
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}{unit.full_name ? ` (${unit.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {validationErrors.unit_id && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.unit_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input 
                    className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                      validationErrors.purchase_price ? 'border-red-500' : ''
                    }`}
                    type="number" 
                    value={editVariation?.purchase_price ?? ''} 
                    onChange={e => handleEditChange('purchase_price', Number(e.target.value))} 
                  />
                  {validationErrors.purchase_price && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.purchase_price}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price</label>
                  <input 
                    className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                      validationErrors.selling_price ? 'border-red-500' : ''
                    }`}
                    type="number" 
                    value={editVariation?.selling_price ?? ''} 
                    onChange={e => handleEditChange('selling_price', Number(e.target.value))} 
                  />
                  {validationErrors.selling_price && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.selling_price}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Stock</label>
                  {(() => {
                    const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                    const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                    
                    if (isKg) {
                      return (
                        <div className="flex items-center gap-2">
                                                      <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.current_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.name}
                              value={editVariation?._mainStock ?? ''}
                              onChange={e => handleEditChange('_mainStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                          <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                                                      <input
                              className={`w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                                validationErrors.current_stock ? 'border-red-500' : ''
                              }`}
                              type="number"
                              min="0"
                              placeholder={selectedUnit.subunit_name}
                              value={editVariation?._subStock ?? ''}
                              onChange={e => handleEditChange('_subStock', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                            />
                          <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                            placeholder="e.g. 5 pcs"
                            value={editVariation?._stockInput ?? ''}
                            pattern="[0-9kglmpcs.\s]*"
                            onChange={e => handleEditChange('_stockInput', e.target.value.replace(/[^0-9kglmpcs.\s]/gi, ''))}
                            onWheel={e => e.currentTarget.blur()}
                          />
                          <span className="text-gray-700 text-sm">{selectedUnit?.name || ''}</span>
                        </div>
                      );
                    }
                  })()}
                  <div className="text-xs text-gray-500 mt-1">
                    Parsed: {(() => {
                      const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                      const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                      
                      if (isKg) {
                        const parsed = parseFractionalInput(`${editVariation?._mainStock || 0} ${editVariation?._subStock || 0}`, selectedUnit?.subunit_factor);
                        return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                      } else {
                        const parsed = parseFractionalInput((editVariation?._stockInput ?? '').toString());
                        return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                      }
                    })()} {units.find(u => u.id === editVariation?.unit_id)?.name || ''}
                  </div>
                  {validationErrors.current_stock && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.current_stock}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label>
                  {(() => {
                    const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                    const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                    
                    if (isKg) {
                      return (
                        <div className="flex items-center gap-2">
                          <input
                            className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                            type="number"
                            min="0"
                            placeholder={selectedUnit.name}
                            value={editVariation?._mainMinStock ?? ''}
                            onChange={e => handleEditChange('_mainMinStock', e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                          />
                          <span className="text-gray-700 text-sm">{selectedUnit.name}</span>
                          <input
                            className="w-16 border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                            type="number"
                            min="0"
                            placeholder={selectedUnit.subunit_name}
                            value={editVariation?._subMinStock ?? ''}
                            onChange={e => handleEditChange('_subMinStock', e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                          />
                          <span className="text-gray-700 text-sm">{selectedUnit.subunit_name}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500"
                            placeholder="e.g. 2 pcs"
                            value={editVariation?._minStockInput ?? ''}
                            pattern="[0-9kglmpcs.\s]*"
                            onChange={e => handleEditChange('_minStockInput', e.target.value.replace(/[^0-9kglmpcs.\s]/gi, ''))}
                            onWheel={e => e.currentTarget.blur()}
                          />
                          <span className="text-gray-700 text-sm">{selectedUnit?.name || ''}</span>
                        </div>
                      );
                    }
                  })()}
                  <div className="text-xs text-gray-500 mt-1">
                    Parsed: {(() => {
                      const selectedUnit = units.find(u => u.id === editVariation?.unit_id);
                      const isKg = selectedUnit?.subunit_name && selectedUnit?.subunit_factor;
                      
                      if (isKg) {
                        const parsed = parseFractionalInput(`${editVariation?._mainMinStock || 0} ${editVariation?._subMinStock || 0}`, selectedUnit?.subunit_factor);
                        return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                      } else {
                        const parsed = parseFractionalInput((editVariation?._minStockInput ?? '').toString());
                        return isNaN(parsed) ? <span className="text-red-600">Invalid</span> : parsed;
                      }
                    })()} {units.find(u => u.id === editVariation?.unit_id)?.name || ''}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    className={`w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500 ${
                      validationErrors.location ? 'border-red-500' : ''
                    }`}
                    value={editVariation?.location ?? ''} 
                    onChange={e => handleEditChange('location', e.target.value)} 
                  />
                  {validationErrors.location && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.location}</p>
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => handleEditSave(idx)} className="bg-blue-600 text-white px-4 py-1 rounded-lg font-medium hover:bg-blue-700 text-sm">Add</button>
                  <button onClick={() => {
                    // If this is a new variation (no id), remove it from pending list
                    if (!v.id) {
                      setPendingVariations(prev => prev.filter((_, i) => i !== idx));
                    }
                    setEditIdx(null);
                    setEditVariation(null);
                  }} className="text-gray-500 hover:text-gray-700 px-4 py-1 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{v.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(idx)} className="p-2 rounded bg-blue-100 hover:bg-blue-200 text-blue-700" title="Edit"><PencilSquareIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(idx)} className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-700" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="text-xs text-gray-700">
                  Unit: {units.find(u => u.id === (v.unit_id ?? 0))?.name || ''}
                  {units.find(u => u.id === (v.unit_id ?? 0))?.full_name && 
                    ` (${units.find(u => u.id === (v.unit_id ?? 0))?.full_name})`
                  }
                </div>
                <div className="text-xs text-gray-700">Purchase Price: {formatCurrency(v.purchase_price ?? 0)}</div>
                <div className="text-xs text-gray-700">Selling Price: {formatCurrency(v.selling_price ?? 0)}</div>
                <div className="text-xs text-gray-700">
                  Current Stock: {(() => {
                    const unit = units.find(u => u.id === (v.unit_id ?? 0));
                    if (unit?.subunit_name && unit?.subunit_factor) {
                      // For units with subunits, show in a more readable format
                      const total = v.current_stock || 0;
                      const main = Math.floor(total);
                      const sub = Math.round((total - main) * unit.subunit_factor);
                      if (sub > 0) {
                        return `${main} ${unit.name} ${sub} ${unit.subunit_name}`;
                      } else {
                        return `${main} ${unit.name}`;
                      }
                    } else {
                      // For regular units, show as is
                      return `${v.current_stock || 0} ${unit?.name || ''}`;
                    }
                  })()}
                </div>
                <div className="text-xs text-gray-700">
                  Min Stock: {(() => {
                    const unit = units.find(u => u.id === (v.unit_id ?? 0));
                    if (unit?.subunit_name && unit?.subunit_factor) {
                      // For units with subunits, show in a more readable format
                      const total = v.min_stock || 0;
                      const main = Math.floor(total);
                      const sub = Math.round((total - main) * unit.subunit_factor);
                      if (sub > 0) {
                        return `${main} ${unit.name} ${sub} ${unit.subunit_name}`;
                      } else {
                        return `${main} ${unit.name}`;
                      }
                    } else {
                      // For regular units, show as is
                      return `${v.min_stock || 0} ${unit?.name || ''}`;
                    }
                  })()}
                </div>
                <div className="text-xs text-gray-700">Location: {v.location}</div>
              </div>
            )}
          </div>
        ))}
        {deleteIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
              <div className="text-lg font-semibold mb-4 text-gray-900">Delete Variation?</div>
              <div className="text-gray-700 mb-6 text-center">Are you sure you want to delete this variation?</div>
              <div className="flex gap-4 w-full">
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700" onClick={confirmDelete}>Delete</button>
                <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300" onClick={() => setDeleteIdx(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <button
          className="w-full mt-6 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg"
          onClick={handleSaveAll}
          disabled={saveLoading}
        >
          {saveLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
} 