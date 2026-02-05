import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../router/all_routes";
import Table from "../../../../core/common/dataTable/index";
import CommonSelect from "../../../../core/common/commonSelect";
import { useLeaveREST, statusDisplayMap, leaveTypeDisplayMap, type LeaveStatus, type LeaveType } from "../../../../hooks/useLeaveREST";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import PredefinedDateRanges from "../../../../core/common/datePicker";
import ImageWithBasePath from "../../../../core/common/imageWithBasePath";
import { DatePicker, Spin } from "antd";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import Footer from "../../../../core/common/footer";

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <Spin size="large" />
  </div>
);

// Status badge component
const StatusBadge = ({ status }: { status: LeaveStatus }) => {
  const config = statusDisplayMap[status] || statusDisplayMap.pending;
  return (
    <span
      className={`badge ${config.badgeClass} d-flex justify-content-center align-items-center`}
      style={{ minWidth: '80px' }}
    >
      {config.label}
    </span>
  );
};

// Leave type badge component
const LeaveTypeBadge = ({ leaveType }: { leaveType: string }) => {
  const displayType = leaveTypeDisplayMap[leaveType] || leaveType;
  return (
    <span className="fs-14 fw-medium d-flex align-items-center">
      {displayType}
      <Link
        to="#"
        className="ms-2"
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title="Leave details"
      >
        <i className="ti ti-info-circle text-info" />
      </Link>
    </span>
  );
};

const LeaveAdmin = () => {
  // API hooks
  const { leaves, loading, fetchLeaves, approveLeave, rejectLeave, deleteLeave, pagination } = useLeaveREST();
  const { employees, fetchEmployees } = useEmployeesREST();

  // Local state for filters
  const [filters, setFilters] = useState<{
    status?: LeaveStatus;
    leaveType?: LeaveType;
    page: number;
    limit: number;
  }>({
    page: 1,
    limit: 20,
  });

  const [selectedLeaveIds, setSelectedLeaveIds] = useState<string[]>([]);

  // State for rejection modal
  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    leaveId: string | null;
    reason: string;
  }>({
    show: false,
    leaveId: null,
    reason: ''
  });

  // Fetch employees on mount for dropdown
  useEffect(() => {
    fetchEmployees({ status: 'Active' }); // Only fetch active employees
  }, []);

  // Fetch leaves on mount and when filters change
  useEffect(() => {
    fetchLeaves(filters);
  }, [filters]);

  // Transform leaves for table display
  const data = leaves.map((leave) => ({
    key: leave._id,
    _id: leave._id,
    Image: "user-32.jpg", // Default image, should come from employee data
    Employee: leave.employeeName || "Unknown",
    Role: "Employee", // Should come from employee data
    LeaveType: leave.leaveType,
    From: formatDate(leave.startDate),
    To: formatDate(leave.endDate),
    NoOfDays: `${leave.duration} Day${leave.duration > 1 ? 's' : ''}`,
    Status: leave.status,
    rawLeave: leave, // Store original data for actions
  }));

  // Helper function to format dates
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Handler functions
  const handleApprove = async (leaveId: string) => {
    const success = await approveLeave(leaveId, "Approved");
    if (success) {
      fetchLeaves(filters); // Refresh list
    }
  };

  const handleRejectClick = (leaveId: string) => {
    setRejectModal({
      show: true,
      leaveId,
      reason: ''
    });
  };

  const handleRejectConfirm = async () => {
    if (rejectModal.leaveId && rejectModal.reason.trim()) {
      const success = await rejectLeave(rejectModal.leaveId, rejectModal.reason);
      if (success) {
        fetchLeaves(filters); // Refresh list
      }
      setRejectModal({ show: false, leaveId: null, reason: '' });
    }
  };

  const handleRejectCancel = () => {
    setRejectModal({ show: false, leaveId: null, reason: '' });
  };

  const handleDelete = async (leaveId: string) => {
    if (window.confirm("Are you sure you want to delete this leave request?")) {
      const success = await deleteLeave(leaveId);
      if (success) {
        fetchLeaves(filters); // Refresh list
      }
    }
  };

  // Employee options for dropdown - Phase 2: Using real employees from API
  const employeename = [
    { value: "", label: "Select Employee" },
    ...employees.map(emp => ({
      value: emp.employeeId,
      label: `${emp.firstName} ${emp.lastName}`.trim()
    }))
  ];

  const columns = [
    {
      title: "Employee",
      dataIndex: "Employee",
      render: (text: String, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={`assets/img/users/${record.Image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{record.Employee}</Link>
            </h6>
            <span className="fs-12 fw-normal ">{record.Role}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.Employee.length - b.Employee.length,
    },
    {
      title: "Leave Type",
      dataIndex: "LeaveType",
      render: (leaveType: string) => <LeaveTypeBadge leaveType={leaveType} />,
      sorter: (a: any, b: any) => a.LeaveType.length - b.LeaveType.length,
    },
    {
      title: "From",
      dataIndex: "From",
      sorter: (a: any, b: any) => a.From.localeCompare(b.From),
    },
    {
      title: "To",
      dataIndex: "To",
      sorter: (a: any, b: any) => a.To.localeCompare(b.To),
    },
    {
      title: "No of Days",
      dataIndex: "NoOfDays",
      sorter: (a: any, b: any) => {
        const aDays = parseInt(a.NoOfDays) || 0;
        const bDays = parseInt(b.NoOfDays) || 0;
        return aDays - bDays;
      },
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (status: LeaveStatus) => <StatusBadge status={status} />,
      sorter: (a: any, b: any) => a.Status.localeCompare(b.Status),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {record.Status === 'pending' && (
            <>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Approve"
                onClick={() => handleApprove(record._id)}
              >
                <i className="ti ti-check text-success" style={{ fontSize: '18px' }} />
              </Link>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Reject"
                onClick={() => handleRejectClick(record._id)}
              >
                <i className="ti ti-x text-danger" style={{ fontSize: '18px' }} />
              </Link>
            </>
          )}
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_leaves"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => setSelectedLeaveIds([record._id])}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  // Dropdown options with proper backend values
  const leavetype = [
    { value: "", label: "All Types" },
    { value: "sick", label: "Medical Leave" },
    { value: "casual", label: "Casual Leave" },
    { value: "earned", label: "Annual Leave" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const selectChoose = [
    { value: "Select", label: "Select" },
    { value: "Full Day", label: "Full Day" },
    { value: "First Half", label: "First Half" },
    { value: "Second Half", label: "Second Half" },
  ];

  // Filter handlers
  const handleStatusFilter = (status: LeaveStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleLeaveTypeFilter = (leaveType: LeaveType) => {
    setFilters(prev => ({ ...prev, leaveType, page: 1 }));
  };

  // Calculate stats from leaves data
  const stats = {
    totalPresent: leaves.length > 0 ? leaves.length + 165 : 180,
    plannedLeaves: leaves.filter(l => l.leaveType === 'casual' || l.leaveType === 'earned').length,
    unplannedLeaves: leaves.filter(l => l.leaveType === 'sick').length,
    pendingRequests: leaves.filter(l => l.status === 'pending').length,
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leaves</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Leaves
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_leaves"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Leave
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Leaves Info */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card bg-green-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-check text-success fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Total Present</p>
                      <h4>{stats.totalPresent}/200</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-pink-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-edit text-pink fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Planned Leaves</p>
                      <h4>{stats.plannedLeaves}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-yellow-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-exclamation text-warning fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Unplanned Leaves</p>
                      <h4>{stats.unplannedLeaves}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-blue-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-question text-info fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Pending Requests</p>
                      <h4>{stats.pendingRequests}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Leaves Info */}
          {/* Leaves list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Leave List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Leave Type
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {leavetype.map(option => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => option.value && handleLeaveTypeFilter(option.value as LeaveType)}
                        >
                          {option.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {statusOptions.map(option => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                          onClick={() => option.value && handleStatusFilter(option.value as LeaveStatus)}
                        >
                          {option.value && <StatusBadge status={option.value as LeaveStatus} />}
                          {!option.value && <span>All Status</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Table
                  dataSource={data}
                  columns={columns}
                  Selection={true}
                />
              )}
            </div>
          </div>
          {/* /Leaves list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Leaves */}
      <div className="modal fade" id="add_leaves">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Leave</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Employee Name</label>
                      <CommonSelect
                        className="select"
                        options={employeename}
                        defaultValue={employeename[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Leave Type</label>
                      <CommonSelect
                        className="select"
                        options={[
                          { value: "sick", label: "Medical Leave" },
                          { value: "casual", label: "Casual Leave" },
                          { value: "earned", label: "Annual Leave" },
                          { value: "maternity", label: "Maternity Leave" },
                          { value: "paternity", label: "Paternity Leave" },
                        ]}
                        defaultValue={{ value: "casual", label: "Casual Leave" }}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <CommonSelect
                        className="select"
                        options={selectChoose}
                        defaultValue={selectChoose[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">No of Days</label>
                      <input type="text" className="form-control" disabled />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Remaining Days</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={8}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        defaultValue={""}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                >
                  Add Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Leaves */}
      {/* Edit Leaves */}
      <div className="modal fade" id="edit_leaves">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Leave</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Employee Name</label>
                      <CommonSelect
                        className="select"
                        options={employeename}
                        defaultValue={employeename[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Leave Type</label>
                      <CommonSelect
                        className="select"
                        options={leavetype}
                        defaultValue={leavetype[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <CommonSelect
                        className="select"
                        options={selectChoose}
                        defaultValue={selectChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">No of Days</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={"01"}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Remaining Days</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={"07"}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="d-flex align-items-center mb-3">
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option4"
                          id="leave6"
                        />
                        <label className="form-check-label" htmlFor="leave6">
                          Full Day
                        </label>
                      </div>
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option5"
                          id="leave5"
                        />
                        <label className="form-check-label" htmlFor="leave5">
                          First Half
                        </label>
                      </div>
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option6"
                          id="leave4"
                        />
                        <label className="form-check-label" htmlFor="leave4">
                          Second Half
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        defaultValue={" Going to Hospital "}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Leaves */}
      {/* Delete Modal */}
      <div className="modal fade" id="delete_modal" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Delete</h4>
              <p className="mb-3">
                Are you sure you want to delete this leave request? This action cannot be undone.
              </p>
              <div className="d-flex justify-content-center">
                <Link
                  to="#"
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  to="#"
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => selectedLeaveIds.forEach(id => handleDelete(id))}
                >
                  Yes, Delete
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Modal */}
      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Reject Leave Request</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={handleRejectCancel}
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Please enter the reason for rejecting this leave request"
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleRejectCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectConfirm}
                  disabled={!rejectModal.reason.trim()}
                >
                  Reject Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Reject Modal */}
    </>
  );
};

export default LeaveAdmin;
