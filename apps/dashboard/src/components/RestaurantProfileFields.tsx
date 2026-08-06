'use client';

import { Button, Col, Form, Input, Row, Select, Switch, Typography } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  AMENITIES,
  DIETARY_TAGS,
  DINING_STYLES,
  DISCOVERY_OCCASIONS,
  MEALS,
} from '@reservations/shared';

const { Text } = Typography;

export function RestaurantProfileFields() {
  return (
    <>
      <Form.Item
        name="description"
        label="About"
        rules={[{ max: 2000, message: 'Max 2000 characters' }]}
        extra="Shown on your public restaurant page."
      >
        <Input.TextArea rows={4} maxLength={2000} showCount placeholder="Tell diners what makes your restaurant special…" />
      </Form.Item>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={12}>
          <Form.Item name="neighborhood" label="Neighborhood" rules={[{ max: 80 }]}>
            <Input placeholder="e.g. SoHo" maxLength={80} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="wheelchairAccessible" label="Wheelchair accessible" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={12}>
          <Form.Item name="diningStyles" label="Dining styles">
            <Select mode="multiple" placeholder="Select styles" options={DINING_STYLES.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="discoveryOccasions" label="Good for">
            <Select mode="multiple" placeholder="Select occasions" options={DISCOVERY_OCCASIONS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="meals" label="Meals served">
            <Select mode="multiple" placeholder="Select meals" options={MEALS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="dietaryTags" label="Dietary options">
            <Select mode="multiple" placeholder="Select dietary tags" options={DIETARY_TAGS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="amenities" label="Amenities & features">
            <Select mode="multiple" placeholder="Select amenities" options={AMENITIES.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginBottom: 8 }}>
        <Text strong>FAQ</Text>
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Add questions diners often ask. Leave empty to use auto-generated defaults.
          </Text>
        </div>
      </div>
      <Form.List name="faq">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...rest }) => (
              <div
                key={key}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: '1px solid var(--color-border, #e3dfd8)',
                  borderRadius: 12,
                }}
              >
                <Row gutter={[12, 0]}>
                  <Col span={24}>
                    <Form.Item
                      {...rest}
                      name={[name, 'question']}
                      label="Question"
                      rules={[{ required: true, message: 'Question is required' }, { max: 300 }]}
                    >
                      <Input maxLength={300} placeholder="e.g. Do you accommodate large groups?" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      {...rest}
                      name={[name, 'answer']}
                      label="Answer"
                      rules={[{ required: true, message: 'Answer is required' }, { max: 2000 }]}
                    >
                      <Input.TextArea rows={2} maxLength={2000} showCount />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)}>
                  Remove question
                </Button>
              </div>
            ))}
            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ marginBottom: 24 }}>
              Add FAQ
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item
        name="termsAndConditions"
        label="Terms & conditions"
        rules={[{ max: 8000, message: 'Max 8000 characters' }]}
        extra="Shown on your public restaurant page. Leave blank to use Tablevera defaults."
      >
        <Input.TextArea
          rows={5}
          maxLength={8000}
          showCount
          placeholder="Cancellation policy, deposit rules, dress code, age restrictions…"
        />
      </Form.Item>

      <div style={{ marginBottom: 8 }}>
        <Text strong>Featured in</Text>
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Press mentions, awards, or publications featuring your restaurant.
          </Text>
        </div>
      </div>
      <Form.List name="featuredIn">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...rest }) => (
              <div
                key={key}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: '1px solid var(--color-border, #e3dfd8)',
                  borderRadius: 12,
                }}
              >
                <Row gutter={[12, 0]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      {...rest}
                      name={[name, 'title']}
                      label="Title"
                      rules={[{ required: true, message: 'Title is required' }, { max: 120 }]}
                    >
                      <Input maxLength={120} placeholder="e.g. New York Times" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item {...rest} name={[name, 'url']} label="Link (optional)" rules={[{ type: 'url', warningOnly: true }]}>
                      <Input placeholder="https://…" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item {...rest} name={[name, 'description']} label="Description" rules={[{ max: 500 }]}>
                      <Input.TextArea rows={2} maxLength={500} showCount placeholder="e.g. Best new restaurant of 2025" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item {...rest} name={[name, 'logoUrl']} label="Logo URL (optional)" rules={[{ type: 'url', warningOnly: true }]}>
                      <Input placeholder="https://…" />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)}>
                  Remove entry
                </Button>
              </div>
            ))}
            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
              Add featured in entry
            </Button>
          </>
        )}
      </Form.List>
    </>
  );
}
