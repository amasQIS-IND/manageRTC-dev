import React, { useState, useEffect } from 'react';

/**
 * Data structure for Department-Designation mapping
 * This structure supports future extensibility and maintains clean relationships
 */
export interface DepartmentDesignationMapping {
  departmentId: string;
  departmentName: string;
  designationIds: string[];
}

interface Designation {
  _id: string;
  designation: string;
  departmentId: string;
  status: string;
}

interface Department {
  _id: string;
  department: string;
  status: string;
}

interface DepartmentDesignationSelectorProps {
  departments: Department[];
  designations: Designation[];
  selectedMappings: DepartmentDesignationMapping[];
  onChange: (mappings: DepartmentDesignationMapping[]) => void;
  label?: string;
  required?: boolean;
  helpText?: string;
  readOnly?: boolean;
}

const DepartmentDesignationSelector: React.FC<DepartmentDesignationSelectorProps> = ({
  departments,
  designations,
  selectedMappings,
  onChange,
  label = "Apply To",
  required = false,
  helpText,
  readOnly = false,
}) => {
  // Track which departments are expanded
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Initialize expanded departments when mappings change
  useEffect(() => {
    const expanded = new Set<string>();
    selectedMappings.forEach(mapping => {
      if (mapping.designationIds.length > 0) {
        expanded.add(mapping.departmentId);
      }
    });
    setExpandedDepartments(expanded);
  }, [selectedMappings]);

  // Check if a department is enabled
  const isDepartmentEnabled = (deptId: string): boolean => {
    return selectedMappings.some(m => m.departmentId === deptId);
  };

  // Get designations for a specific department
  const getDesignationsForDepartment = (deptId: string): Designation[] => {
    return designations.filter(d => d.departmentId === deptId && d.status === 'active');
  };

  // Get selected designation IDs for a department
  const getSelectedDesignations = (deptId: string): string[] => {
    const mapping = selectedMappings.find(m => m.departmentId === deptId);
    return mapping ? mapping.designationIds : [];
  };

  // Toggle department on/off
  const toggleDepartment = (dept: Department) => {
    const isCurrentlyEnabled = isDepartmentEnabled(dept._id);
    
    if (isCurrentlyEnabled) {
      // Remove this department
      const newMappings = selectedMappings.filter(m => m.departmentId !== dept._id);
      onChange(newMappings);
      
      // Collapse this department
      const newExpanded = new Set(expandedDepartments);
      newExpanded.delete(dept._id);
      setExpandedDepartments(newExpanded);
    } else {
      // Add this department with all its designations selected by default
      const deptDesignations = getDesignationsForDepartment(dept._id);
      const newMapping: DepartmentDesignationMapping = {
        departmentId: dept._id,
        departmentName: dept.department,
        designationIds: deptDesignations.map(d => d._id),
      };
      onChange([...selectedMappings, newMapping]);
      
      // Expand this department
      const newExpanded = new Set(expandedDepartments);
      newExpanded.add(dept._id);
      setExpandedDepartments(newExpanded);
    }
  };

  // Toggle a specific designation
  const toggleDesignation = (deptId: string, designationId: string) => {
    const newMappings = selectedMappings.map(mapping => {
      if (mapping.departmentId === deptId) {
        const currentIds = mapping.designationIds;
        const newIds = currentIds.includes(designationId)
          ? currentIds.filter(id => id !== designationId)
          : [...currentIds, designationId];
        
        return { ...mapping, designationIds: newIds };
      }
      return mapping;
    });
    
    onChange(newMappings);
  };

  // Toggle expand/collapse for a department
  const toggleExpand = (deptId: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepartments(newExpanded);
  };

  // Select all designations for a department
  const selectAllDesignations = (deptId: string) => {
    const deptDesignations = getDesignationsForDepartment(deptId);
    const newMappings = selectedMappings.map(mapping => {
      if (mapping.departmentId === deptId) {
        return { ...mapping, designationIds: deptDesignations.map(d => d._id) };
      }
      return mapping;
    });
    onChange(newMappings);
  };

  // Clear all designations for a department
  const clearAllDesignations = (deptId: string) => {
    // Remove the entire department mapping to turn off the toggle
    const newMappings = selectedMappings.filter(m => m.departmentId !== deptId);
    onChange(newMappings);
    
    // Collapse the department since it's being disabled
    const newExpanded = new Set(expandedDepartments);
    newExpanded.delete(deptId);
    setExpandedDepartments(newExpanded);
  };

  // Select all departments with all their designations
  const selectAllDepartments = () => {
    const newMappings: DepartmentDesignationMapping[] = activeDepartments.map(dept => {
      const deptDesignations = getDesignationsForDepartment(dept._id);
      return {
        departmentId: dept._id,
        departmentName: dept.department,
        designationIds: deptDesignations.map(d => d._id),
      };
    });
    onChange(newMappings);
    
    // Collapse all departments after selecting
    setExpandedDepartments(new Set());
  };

  // Clear all departments
  const clearAllDepartments = () => {
    onChange([]);
    setExpandedDepartments(new Set());
  };

  // Check if all departments are selected
  const areAllDepartmentsSelected = (): boolean => {
    if (activeDepartments.length === 0) return false;
    return activeDepartments.every(dept => isDepartmentEnabled(dept._id));
  };

  // Toggle all departments on/off
  const toggleAllDepartments = () => {
    if (areAllDepartmentsSelected()) {
      clearAllDepartments();
    } else {
      selectAllDepartments();
    }
  };

  // Get active departments only
  const activeDepartments = departments.filter(d => d.status === 'active');

  return (
    <div className="mb-3">
      <label className="form-label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {helpText && (
        <div className="text-muted small mb-2">
          <i className="ti ti-info-circle me-1"></i>
          {helpText}
        </div>
      )}
      
      <div className="border rounded p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {activeDepartments.length === 0 ? (
          <div className="text-center text-muted py-3">
            <i className="ti ti-folder-x fs-24 mb-2"></i>
            <p className="mb-0">No departments available</p>
          </div>
        ) : (
          <>
            {/* Select All Departments Toggle */}
            {!readOnly && (
              <div className="mb-3 pb-3 border-bottom bg-light rounded p-2">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="form-check form-switch me-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="toggle-all-departments"
                        checked={areAllDepartmentsSelected()}
                        onChange={toggleAllDepartments}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <label
                      htmlFor="toggle-all-departments"
                      className="mb-0 fw-bold"
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="ti ti-select-all me-2"></i>
                      Select All Departments
                      {selectedMappings.length > 0 && (
                        <span className="badge bg-success ms-2">
                          {selectedMappings.length}/{activeDepartments.length}
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Individual Department List */}
            <div className="department-designation-list">{activeDepartments.map((dept) => {
              const isEnabled = isDepartmentEnabled(dept._id);
              const isExpanded = expandedDepartments.has(dept._id);
              const deptDesignations = getDesignationsForDepartment(dept._id);
              const selectedDesignationIds = getSelectedDesignations(dept._id);
              const hasDesignations = deptDesignations.length > 0;

              return (
                <div key={dept._id} className="mb-3 border-bottom pb-3">
                  {/* Department Header */}
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center flex-grow-1">
                      {/* Toggle Switch */}
                      <div className="form-check form-switch me-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id={`dept-toggle-${dept._id}`}
                          checked={isEnabled}
                          onChange={() => toggleDepartment(dept)}
                          style={{ cursor: 'pointer' }}
                          disabled={readOnly}
                        />
                      </div>
                      
                      {/* Department Name */}
                      <label
                        htmlFor={`dept-toggle-${dept._id}`}
                        className="mb-0 fw-medium"
                        style={{ cursor: 'pointer' }}
                      >
                        {dept.department}
                        {isEnabled && hasDesignations && (
                          <span className="badge bg-primary ms-2">
                            {selectedDesignationIds.length}/{deptDesignations.length} designations
                          </span>
                        )}
                      </label>
                    </div>

                    {/* Expand/Collapse Button */}
                    {isEnabled && hasDesignations && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => toggleExpand(dept._id)}
                      >
                        <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                      </button>
                    )}
                  </div>

                  {/* Designations List (shown when department is enabled and expanded) */}
                  {isEnabled && isExpanded && (
                    <div className="mt-3 ms-4 ps-3 border-start">
                      {deptDesignations.length === 0 ? (
                        <div className="text-muted small">
                          <i className="ti ti-alert-circle me-1"></i>
                          No active designations in this department
                        </div>
                      ) : (
                        <>
                          {/* Select All / Clear All Buttons */}
                          {!readOnly && (
                            <div className="mb-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => selectAllDesignations(dept._id)}
                              >
                                <i className="ti ti-check me-1"></i>
                                Select All
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => clearAllDesignations(dept._id)}
                              >
                                <i className="ti ti-x me-1"></i>
                                Clear All
                              </button>
                            </div>
                          )}

                          {/* Designation Checkboxes */}
                          <div className="designation-checkboxes">
                            {deptDesignations.map((designation) => (
                              <div key={designation._id} className="form-check mb-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`designation-${designation._id}`}
                                  checked={selectedDesignationIds.includes(designation._id)}
                                  onChange={() => toggleDesignation(dept._id, designation._id)}
                                  disabled={readOnly}
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`designation-${designation._id}`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {designation.designation}
                                </label>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Show message if no designations when expanded */}
                  {isEnabled && !hasDesignations && isExpanded && (
                    <div className="mt-2 ms-4 text-muted small">
                      <i className="ti ti-alert-circle me-1"></i>
                      No active designations available
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      {selectedMappings.length > 0 && (
        <div className="mt-2 text-muted small">
          <i className="ti ti-check-circle me-1 text-success"></i>
          Policy will apply to <strong>{selectedMappings.length}</strong> department(s):
          <span className="ms-1">
            {selectedMappings.map(m => m.departmentName).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default DepartmentDesignationSelector;