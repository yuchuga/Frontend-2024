import React, { useState } from 'react'
import * as util from '@/utils/util'
import { Button, Container, Col, Dropdown, Form, Modal, Row } from 'react-bootstrap'

const ApprovalModal = (props) => {
  const { title, rowData, show, toggleShow } = props;

  const initialState = {
    RequestedBy: rowData[0].lockedBy,
    RequestedOn: util.epochToLocalTime(rowData[0].lockedOn),
    CIF: rowData[0].cif,
    ISIN: rowData[0].isin,
    Entity: rowData[0].entity,
    CptyName: rowData[0].cptyName
  };

  const [form] = useState(initialState)

  return (
    <>
      <Modal size='lg' show={show} onHide={toggleShow} centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col>
                <Form.Label>Requested By</Form.Label>
                <Form.Control disabled type='text' value={form.RequestedBy} />
              </Col>
              <Col>
                <Form.Label>Requested On</Form.Label>
                <Form.Control disabled type='text' value={form.RequestedOn} />
              </Col>
            </Row>

            <Row>
              <Col>
                <Form.Label>Entity</Form.Label>
                <Form.Control disabled type='text' value={form.Entity} />
              </Col>
              <Col>
                <Form.Label>Counterparty Name</Form.Label>
                <Form.Control disabled type='text' value={form.CptyName} />
              </Col>
            </Row>

            {rowData.map((item, index) => 
              <Container fluid className='ml-1 mt-3' key={index}>
                <Row>
                  <Form.Text><b>Trade ID:</b> {item.tradeId}</Form.Text>
                </Row>
                <Row>
                  <Form.Text><b>Updated On:</b> {util.epochToLocalTime(item.updated)}</Form.Text>
                </Row>
              </Container>
            )}
            <Dropdown.Divider className='mt-3' />
          </Form>

          <Row style={{ justifyContent: 'center', marginTop: 20 }}>
            <Button variant='secondary' onClick={toggleShow}>
              Close
            </Button>
          </Row>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default ApprovalModal