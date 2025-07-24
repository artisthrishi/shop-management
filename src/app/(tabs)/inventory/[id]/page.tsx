"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProductWithVariations, getUnits, createProductVariation, updateProductVariation, deleteProductVariation } from '@/lib/database';
import type { Product, ProductVariation, Unit } from '@/types';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { TrashIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVariation, setEditVariation] = useState<any | null>(null);
  const [pendingVariations, setPendingVariations] = useState<any[]>([]);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getProductWithVariations(productId),
      getUnits()
    ])
      .then(([prod, units]) => {
        setProduct(prod);
        setVariations(prod.product_variations || []);
        setUnits(units);
        setPendingVariations(prod.product_variations || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Error loading product');
        setLoading(false);
      });
  }, [productId]);

  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    setEditVariation({ ...pendingVariations[idx] });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditVariation((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (idx: number) => {
    setSaveLoading(true);
    const v = editVariation;
    try {
      if (v.id) {
        await updateProductVariation(v.id, v);
      } else {
        await createProductVariation({ ...v, product_id: productId });
      }
      setPendingVariations((prev) => prev.map((pv, i) => (i === idx ? { ...editVariation } : pv)));
      setEditIdx(null);
      setEditVariation(null);
      // Refresh product data
      const prod = await getProductWithVariations(productId);
      setProduct(prod);
      setVariations(prod.product_variations || []);
      setPendingVariations(prod.product_variations || []);
      toast.success('Variation saved successfully!');
    } catch (e: any) {
      setError(e.message || 'Error saving variation');
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
        setVariations(prod.product_variations || []);
        setPendingVariations(prod.product_variations || []);
        toast.success('Variation deleted successfully!');
      }
    } catch (e: any) {
      setError(e.message || 'Error deleting variation');
    }
    setSaveLoading(false);
  };

  const handleAddVariation = () => {
    setPendingVariations((prev) => [
      ...prev,
      { name: '', unit_id: units[0]?.id || 1, purchase_price: 0, selling_price: 0, current_stock: 0, min_stock: 0, location: '' },
    ]);
    setEditIdx(pendingVariations.length);
    setEditVariation({ name: '', unit_id: units[0]?.id || 1, purchase_price: 0, selling_price: 0, current_stock: 0, min_stock: 0, location: '' });
  };

  const handleSaveAll = async () => {
    setSaveLoading(true);
    try {
      // Update all variations in pendingVariations
      for (const v of pendingVariations) {
        if (v.id) {
          await updateProductVariation(v.id, v);
        } else {
          await createProductVariation({ ...v, product_id: productId });
        }
      }
      // Refresh product data
      const prod = await getProductWithVariations(productId);
      setProduct(prod);
      setVariations(prod.product_variations || []);
      setPendingVariations(prod.product_variations || []);
      router.push('/inventory');
      toast.success('All variations saved successfully!');
    } catch (e: any) {
      setError(e.message || 'Error saving changes');
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
        <div className="text-sm text-gray-500">Location: {product.location}</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-900">Variations</div>
          <button onClick={handleAddVariation} className="flex items-center text-blue-600 hover:underline text-sm font-medium">
            <PlusIcon className="w-5 h-5 mr-1" /> Add Variation
          </button>
        </div>
        {pendingVariations.length === 0 && <div className="text-gray-500">No variations found.</div>}
        {pendingVariations.map((v, idx) => (
          <div key={idx} className="border rounded p-3 mb-3 bg-gray-50">
            {editIdx === idx ? (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" value={editVariation.name} onChange={e => handleEditChange('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full border rounded px-2 py-1 text-gray-900" value={editVariation.unit_id} onChange={e => handleEditChange('unit_id', Number(e.target.value))}>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" type="number" value={editVariation.purchase_price} onChange={e => handleEditChange('purchase_price', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" type="number" value={editVariation.selling_price} onChange={e => handleEditChange('selling_price', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Stock</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" type="number" value={editVariation.current_stock} onChange={e => handleEditChange('current_stock', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" type="number" value={editVariation.min_stock} onChange={e => handleEditChange('min_stock', Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" value={editVariation.location} onChange={e => handleEditChange('location', e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => handleEditSave(idx)} className="bg-blue-600 text-white px-4 py-1 rounded-lg font-medium hover:bg-blue-700 text-sm">Add</button>
                  <button onClick={() => { setEditIdx(null); setEditVariation(null); }} className="text-gray-500 hover:text-gray-700 px-4 py-1 rounded-lg text-sm">Cancel</button>
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
                <div className="text-xs text-gray-700">Unit: {units.find(u => u.id === v.unit_id)?.name || ''}</div>
                <div className="text-xs text-gray-700">Purchase Price: {formatCurrency(v.purchase_price)}</div>
                <div className="text-xs text-gray-700">Selling Price: {formatCurrency(v.selling_price)}</div>
                <div className="text-xs text-gray-700">Current Stock: {v.current_stock}</div>
                <div className="text-xs text-gray-700">Min Stock: {v.min_stock}</div>
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