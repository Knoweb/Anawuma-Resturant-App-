import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import EditSubcategoryModal from '../components/subcategories/EditSubcategoryModal';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import './Subcategories.css';
import './AddMenu.css'; // Reusing common styles

function Subcategories() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    categoryId: '',
    subcategoryName: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubcategories(formData.categoryId);
    } else {
      setSubcategories([]);
    }
  }, [formData.categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/subcategories?categoryId=${categoryId}`);
      setSubcategories(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.categoryId) newErrors.categoryId = 'Please select a category';
    if (!formData.subcategoryName.trim()) {
      newErrors.subcategoryName = 'Subcategory name is required';
    } else if (formData.subcategoryName.length > 20) {
      newErrors.subcategoryName = 'Maximum 20 characters allowed';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await apiClient.post('/subcategories', {
        subcategoryName: formData.subcategoryName.trim(),
        categoryId: parseInt(formData.categoryId)
      });

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Subcategory added successfully',
        timer: 2000,
        showConfirmButton: false
      });

      setFormData(prev => ({ ...prev, subcategoryName: '' }));
      fetchSubcategories(formData.categoryId);
    } catch (error) {
      console.error('Error adding subcategory:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to add subcategory'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (subcategoryId, subcategoryName) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${subcategoryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiClient.delete(`/subcategories/${subcategoryId}`);
          Swal.fire({ icon: 'success', title: 'Deleted!', timer: 2000, showConfirmButton: false });
          fetchSubcategories(formData.categoryId);
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete' });
        }
      }
    });
  };

  const handleEdit = (sub) => {
    setSelectedSubcategory(sub);
    setShowEditModal(true);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        
        <EditSubcategoryModal 
          show={showEditModal} 
          onHide={() => setShowEditModal(false)} 
          onSuccess={() => fetchSubcategories(formData.categoryId)}
          subcategory={selectedSubcategory}
        />

        <div className="dashboard-content">
          <div className="container-fluid py-4">
            
            {/* Add Subcategory Form */}
            <div className="mb-5">
              <h2 className="mb-4 fw-bold" style={{ fontSize: '1.8rem' }}>Add Subcategory</h2>
              <form onSubmit={handleAddSubmit} style={{ maxWidth: '100%' }}>
                <div className="mb-4">
                  <label className="form-label fw-normal mb-2">Category:</label>
                  <select 
                    className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleFormChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                    ))}
                  </select>
                  {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
                </div>

                <div className="mb-2">
                  <label className="form-label fw-normal mb-2">Subcategory Name:</label>
                  <input 
                    type="text"
                    className={`form-control ${errors.subcategoryName ? 'is-invalid' : ''}`}
                    name="subcategoryName"
                    value={formData.subcategoryName}
                    onChange={handleFormChange}
                    maxLength={20}
                  />
                  <div className="text-end text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                    {formData.subcategoryName.length}/20 characters
                  </div>
                  {errors.subcategoryName && <div className="invalid-feedback">{errors.subcategoryName}</div>}
                </div>
                <small className="text-muted d-block mb-3">Maximum 20 characters allowed</small>

                <button 
                  type="submit" 
                  className="btn btn-primary px-4 py-2"
                  disabled={submitting}
                  style={{ backgroundColor: '#007bff', border: 'none', borderRadius: '4px' }}
                >
                  {submitting ? 'Adding...' : 'Add Subcategory'}
                </button>
              </form>
            </div>

            {/* Subcategories List */}
            <div className="mt-5 pt-4 border-top">
              <h2 className="mb-4 fw-bold" style={{ fontSize: '1.8rem' }}>Subcategories List</h2>
              
              {!formData.categoryId ? (
                <div className="alert alert-info text-center py-4">
                  <i className="fas fa-info-circle me-2"></i>
                  Please select a category above to view its subcategories.
                </div>
              ) : loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th className="px-4 py-3">Subcategory Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subcategories.map((sub) => (
                            <tr key={sub.subcategoryId}>
                              <td className="px-4 py-3 align-middle">{sub.subcategoryName}</td>
                              <td className="px-4 py-3 align-middle">
                                <span className="text-muted">
                                  {categories.find(c => c.categoryId === parseInt(formData.categoryId))?.categoryName}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="btn-group">
                                  <button className="btn btn-link text-primary p-0 me-3" onClick={() => handleEdit(sub)}>Edit</button>
                                  <button className="btn btn-link text-danger p-0" onClick={() => handleDelete(sub.subcategoryId, sub.subcategoryName)}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {subcategories.length === 0 && (
                            <tr>
                              <td colSpan="3" className="text-center py-4 text-muted">No subcategories found in this category.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
        
        <footer className="dashboard-simple-footer py-3 px-4 border-top bg-white mt-auto">
          <div className="container-fluid text-muted" style={{ fontSize: '0.9rem' }}>
            Copyright © Knoweb PVT LTD {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Subcategories;
