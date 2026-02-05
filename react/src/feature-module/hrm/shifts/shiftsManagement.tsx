/**
 * Shifts Management Component
 * Allows admin/HR to manage work shifts for employees
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  TimePicker,
  InputNumber,
  Switch,
  Select,
  ColorPicker,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useShiftsREST, Shift, CreateShiftRequest } from '../../../hooks/useShiftsREST';

const { TextArea } = Input;
const { Option } = Select;

interface ShiftsManagementProps {}

export const ShiftsManagement: React.FC<ShiftsManagementProps> = () => {
  const { shifts, defaultShift, loading, fetchShifts, createShift, updateShift, deleteShift, setAsDefault } = useShiftsREST();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form] = Form.useForm();

  // Working days options
  const workingDaysOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
  ];

  // Shift type options
  const shiftTypeOptions = [
    { label: 'Regular', value: 'regular' },
    { label: 'Night', value: 'night' },
    { label: 'Rotating', value: 'rotating' },
    { label: 'Flexible', value: 'flexible' },
    { label: 'Custom', value: 'custom' }
  ];

  // Handle create/update shift
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const shiftData: CreateShiftRequest = {
        name: values.name,
        code: values.code?.toUpperCase(),
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        duration: values.duration,
        timezone: values.timezone || 'UTC',
        gracePeriod: values.gracePeriod || 15,
        earlyDepartureAllowance: values.earlyDepartureAllowance || 15,
        minHoursForFullDay: values.minHoursForFullDay || 8,
        halfDayThreshold: values.halfDayThreshold || 4,
        overtime: {
          enabled: values.overtimeEnabled ?? true,
          threshold: values.overtimeThreshold || 8,
          multiplier: values.overtimeMultiplier || 1.5
        },
        breakSettings: {
          enabled: values.breakEnabled ?? true,
          mandatory: values.breakMandatory ?? false,
          duration: values.breakDuration || 60,
          maxDuration: values.breakMaxDuration || 90
        },
        flexibleHours: {
          enabled: values.flexibleEnabled ?? false,
          windowStart: values.flexibleWindowStart?.format('HH:mm'),
          windowEnd: values.flexibleWindowEnd?.format('HH:mm'),
          minHoursInOffice: values.flexibleMinHours || 8
        },
        type: values.type || 'regular',
        workingDays: values.workingDays || [1, 2, 3, 4, 5],
        color: values.color || '#1890ff',
        description: values.description,
        isActive: values.isActive ?? true,
        isDefault: values.isDefault ?? false
      };

      if (editingShift) {
        await updateShift(editingShift._id, shiftData);
        message.success('Shift updated successfully!');
      } else {
        await createShift(shiftData);
        message.success('Shift created successfully!');
      }

      setIsModalOpen(false);
      setEditingShift(null);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Handle edit
  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    form.setFieldsValue({
      name: shift.name,
      code: shift.code,
      startTime: dayjs(shift.startTime, 'HH:mm'),
      endTime: dayjs(shift.endTime, 'HH:mm'),
      duration: shift.duration,
      timezone: shift.timezone,
      gracePeriod: shift.gracePeriod,
      earlyDepartureAllowance: shift.earlyDepartureAllowance,
      minHoursForFullDay: shift.minHoursForFullDay,
      halfDayThreshold: shift.halfDayThreshold,
      overtimeEnabled: shift.overtime?.enabled,
      overtimeThreshold: shift.overtime?.threshold,
      overtimeMultiplier: shift.overtime?.multiplier,
      breakEnabled: shift.breakSettings?.enabled,
      breakMandatory: shift.breakSettings?.mandatory,
      breakDuration: shift.breakSettings?.duration,
      breakMaxDuration: shift.breakSettings?.maxDuration,
      flexibleEnabled: shift.flexibleHours?.enabled,
      flexibleWindowStart: shift.flexibleHours?.windowStart ? dayjs(shift.flexibleHours.windowStart, 'HH:mm') : null,
      flexibleWindowEnd: shift.flexibleHours?.windowEnd ? dayjs(shift.flexibleHours.windowEnd, 'HH:mm') : null,
      flexibleMinHours: shift.flexibleHours?.minHoursInOffice,
      type: shift.type,
      workingDays: shift.workingDays,
      color: shift.color,
      description: shift.description,
      isActive: shift.isActive,
      isDefault: shift.isDefault
    });
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (shiftId: string) => {
    const success = await deleteShift(shiftId);
    if (success) {
      message.success('Shift deleted successfully!');
    }
  };

  // Handle set as default
  const handleSetDefault = async (shiftId: string) => {
    const success = await setAsDefault(shiftId);
    if (success) {
      message.success('Default shift updated successfully!');
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingShift(null);
    form.resetFields();
    form.setFieldsValue({
      workingDays: [1, 2, 3, 4, 5],
      color: '#1890ff',
      isActive: true,
      gracePeriod: 15,
      earlyDepartureAllowance: 15,
      minHoursForFullDay: 8,
      halfDayThreshold: 4,
      overtimeEnabled: true,
      overtimeThreshold: 8,
      overtimeMultiplier: 1.5,
      breakEnabled: true,
      breakMandatory: false,
      breakDuration: 60,
      breakMaxDuration: 90,
      type: 'regular'
    });
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    form.resetFields();
  };

  const columns: ColumnsType<Shift> = [
    {
      title: 'Shift Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (name: string, record) => (
        <Space>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: record.color,
              marginRight: 8
            }}
          />
          <span>{name}</span>
          {record.isDefault && (
            <Tag color="blue" icon={<CheckCircleOutlined />}>Default</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => code ? <Tag>{code}</Tag> : '-'
    },
    {
      title: 'Time',
      key: 'time',
      width: 150,
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined />
          <span>{record.startTime} - {record.endTime}</span>
        </Space>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration}h`
    },
    {
      title: 'Grace Period',
      dataIndex: 'gracePeriod',
      key: 'gracePeriod',
      width: 120,
      render: (gracePeriod: number) => `${gracePeriod} min`
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'night' ? 'purple' : type === 'flexible' ? 'green' : 'default'}>
          {type?.charAt(0).toUpperCase() + type?.slice(1)}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          {!record.isDefault && (
            <Tooltip title="Set as default">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSetDefault(record._id)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this shift?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="shifts-management">
      <Card
        title="Shift Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Add Shift
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={shifts}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} shifts`
          }}
        />
      </Card>

      {/* Create/Edit Shift Modal */}
      <Modal
        title={editingShift ? 'Edit Shift' : 'Create New Shift'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={800}
        okText={editingShift ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            workingDays: [1, 2, 3, 4, 5],
            color: '#1890ff',
            isActive: true,
            gracePeriod: 15,
            earlyDepartureAllowance: 15,
            minHoursForFullDay: 8,
            halfDayThreshold: 4,
            type: 'regular'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Shift Name"
                name="name"
                rules={[{ required: true, message: 'Please enter shift name' }]}
              >
                <Input placeholder="e.g., Morning Shift" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Shift Code"
                name="code"
              >
                <Input placeholder="e.g., MS" maxLength={20} style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Start Time"
                name="startTime"
                rules={[{ required: true, message: 'Please select start time' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="End Time"
                name="endTime"
                rules={[{ required: true, message: 'Please select end time' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Grace Period (min)"
                name="gracePeriod"
                tooltip="Minutes allowed for late arrival before marking as late"
              >
                <InputNumber min={0} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Early Departure (min)"
                name="earlyDepartureAllowance"
                tooltip="Minutes allowed for early departure"
              >
                <InputNumber min={0} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Duration (hours)"
                name="duration"
              >
                <InputNumber min={1} max={24} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Overtime Settings</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Enable Overtime"
                name="overtimeEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Overtime Threshold (hrs)"
                name="overtimeThreshold"
              >
                <InputNumber min={1} max={12} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Overtime Multiplier"
                name="overtimeMultiplier"
              >
                <InputNumber min={1} max={3} step={0.1} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Break Settings</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Enable Break"
                name="breakEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Break Duration (min)"
                name="breakDuration"
              >
                <InputNumber min={0} max={180} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Max Break (min)"
                name="breakMaxDuration"
              >
                <InputNumber min={0} max={240} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Flexible Hours</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Enable Flexible Hours"
                name="flexibleEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Window Start"
                name="flexibleWindowStart"
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Window End"
                name="flexibleWindowEnd"
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Other Settings</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Shift Type"
                name="type"
              >
                <Select>
                  {shiftTypeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Color"
                name="color"
              >
                <ColorPicker showText />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Working Days"
            name="workingDays"
          >
            <Select
              mode="multiple"
              placeholder="Select working days"
              options={workingDaysOptions}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Enter shift description (optional)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Is Active"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Is Default"
                name="isDefault"
                valuePropName="checked"
                tooltip="This will be set as the default shift for the company"
              >
                <Switch checkedChildren="Default" unCheckedChildren="Not Default" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ShiftsManagement;
