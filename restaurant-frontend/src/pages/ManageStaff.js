import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import { useAuthStore } from '../store/authStore';

const ROLE_LABELS = {
  admin: 'Admin',
  kitchen: 'Kitchen Staff',
  cashier: 'Cashier',
  accountant: 'Accountant',
  housekeeper: 'Housekeeper',
  steward: 'Steward',
};

const ROLE_BADGES = {
  admin: 'bg-primary',
  kitchen: 'bg-warning text-dark',
  cashier: 'bg-success',
  accountant: 'bg-info text-dark',
  housekeeper: 'bg-secondary',
  steward: 'bg-dark',
};

function ManageStaff() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      // We need a backend endpoint that returns staff for the current restaurant
      // For now, let's assume /auth/admin/restaurant-staff exists or we can use /restaurant/:id staff if we implement it.
      // Wait, let's implement the backend endpoint if it's missing.
      const response = await apiClient.get(`/auth/restaurant-staff`);
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      // Fallback or empty
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId) => {
    if (adminId === user.id) {
       Swal.fire('Error', 'You cannot delete your own account', 'error');
       return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This staff member will lose access to the system.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!'
    });

    if (result.isConfirmed) {
      try {
        const response = await apiClient.delete(`/auth/admin/${adminId}`);
        if (response.data.success) {
          Swal.fire('Deleted!', 'Staff member has been removed.', 'success');
          fetchStaff();
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to delete staff member', 'error');
      }
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Staff Management</h2>
          <p className="text-muted">Manage your restaurant's cashiers, kitchen staff, and other users.</p>
        </div>
        <Link to="/settings/staff/add" className="btn btn-primary">
          <i className="fas fa-plus me-2"></i> Add New Staff
        </Link>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Email</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      No staff members found. Add your first team member!
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member.adminId}>
                      <td className="px-4">
                        <div className="d-flex align-items-center">
                          <div className="avatar-circle me-3 bg-light text-primary fw-bold">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold">{member.email.split('@')[0]}</div>
                            <small className="text-muted">ID: {member.adminId}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ROLE_BADGES[member.role] || 'bg-dark'}`}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </td>
                      <td>{member.email}</td>
                      <td className="text-end px-4">
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(member.adminId)}
                          disabled={member.adminId === user.id}
                          title="Delete Staff"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }
        .table thead th {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.5px;
          border-bottom: none;
        }
        .table tbody tr {
          border-bottom: 1px solid #f0f0f0;
        }
        .table tbody tr:last-child {
          border-bottom: none;
        }
      `}} />
    </div>
  );
}

export default ManageStaff;
