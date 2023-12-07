import React, { useState } from 'react'
import axios from 'axios'
import toastr from 'toastr'
import * as util from '@/utils/util'
import Loader from '@/components/Loader'
import PageTitle from '@/components/PageTitle'
import BondsModal from './bondsModal'
import { AgGridColumn } from 'ag-grid-react'
import { Button, Col, Form, Modal, Row } from 'react-bootstrap'
import { AiFillEye } from 'react-icons/ai'
import { Endpoints, notifyConfig } from '@/utils/constants'
import { AgGridBase, filterParams } from '@/utils/grid-constants'

const BondTransfer = () => {

  const [gridApi, setGridApi] = useState(null)
  const [, setGridColumnApi] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [CIF, setCIF] = useState('')
  const [ISIN, setISIN] = useState('')
  const [activeTrades, setActiveTrades] = useState([])

  const [loading, setLoading] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [showView, setShowView] = useState(false)

  const onGridReady = (params) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
    params.api.refreshCells()
  };

  const getActiveTrades = async (CIF, ISIN) => {
    try {
      if (CIF && ISIN) {
        setLoading(true)
        const PATH = Endpoints.BONDS_TRANSFER
        const params = { cif: CIF, isin: ISIN }
        const response = await axios.get(PATH, { params })
        console.log('GET API', response)
        setActiveTrades(response.data.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  };

  const handleRequest = async (selectedRow) => {
    try {
      setModalLoading(true)
      const PATH = Endpoints.BONDS_TRANSFER_REQUEST
      const response = await axios.post(PATH, selectedRow)
      console.log('Create API', response)
      handleNotify(response.data)
      setModalLoading(false)
      handleClose()
    } catch (error) {
      console.error(error)
    }
  };

  const handleNotify = (data) => {
    data.forEach((item) => {
      (item.responseCode = '0000')
        ? toastr.success(item.remarks, `Success - ${item.id}`, notifyConfig)
        : toastr.error(item.remarks, `Error - ${item.id}`, notifyConfig)
    })
  }

  const handleShow = () => setShow(true);
  
  const handleClose = () => {
    setShow(false)
    gridApi.deselectAll()
  };

  const handleChangeCIF = (e) => {
    setCIF(e.target.value)
  };

  const handleChangeISIN = (e) => {
    setISIN(e.target.value)
  };

  const handleSelectChange = () => {
    let record = gridApi.getSelectedRows()
    setSelectedRow(record)
  };

  const nominalAmtFormat = (params) => {
    return params.value.toLocaleString()
  };

  const toggleView = () => setShowView(prev => !prev);

  const handleView = (params) => {
    const row = []
    const rowData = params.data
    row.push(rowData)
    setSelectedRow(row)
    toggleView()
  };

  const IconSet = (params) => {
    return (
      <div id='IconSet' style={{ margin: 0, cursor: 'pointer' }}>
        <AiFillEye style={{ fontSize: 20, marginLeft: 5 }} onClick={() => handleView(params)} />
      </div>
    )
  };

  function columns() {
    return [
      <AgGridColumn
        width={50}
        checkboxSelection={true}
        headerCheckboxSelection={true}
        lockPosition={true}
        sortable={false}
        suppressSizeToFit={true}
      />,
      <AgGridColumn
        headerName='Action'
        minWidth={60}
        editable={false}
        sortable={false}
        cellRendererFramework={IconSet}
      />,
      <AgGridColumn 
        headerName='Trade ID'
        field='tradeId'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Customer CIF'
        field='cif'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Bond ISIN'
        field='isin'
        minWidth={125}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Trade Date'
        field='tradeDate'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={({ value }) => util.epochToLocalDate(value)}
      />,
      <AgGridColumn 
        headerName='Nominal Amount'
        field='nominalAmount'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={nominalAmtFormat}
      />,
      <AgGridColumn 
        headerName='Updated By'
        field='updatedBy'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Updated On'
        field='updatedOn'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={({ value }) => util.epochToLocalTime(value)}
      />
    ]
  };

  return (
    <>
      <PageTitle title='Holding Transfer Deletion' />
      <Form>
        <Row>
          <Col xs={3}>
            <Form.Label>CIF</Form.Label>
            <Form.Control type='text' placeholder="Enter CIF" value={CIF} onChange={handleChangeCIF} />
          </Col>
          <Col xs={3}>
            <Form.Label>ISIN</Form.Label>
            <Form.Control type='text' placeholder="Enter ISIN" value={ISIN} onChange={handleChangeISIN} />
          </Col>
          <Col xs='auto'>
            <Button variant='primary' onClick={() => getActiveTrades(CIF, ISIN)} style={{ marginTop: 30 }} >
              {loading && <Loader />}
              {!loading ? 'Search' : 'Searching...'}
            </Button>
          </Col>
          <Col xs='auto'>
            <Button variant='primary' onClick={handleShow} style={{ marginTop: 30 }}>
              Delete
            </Button>
          </Col>
        </Row>
      </Form>

      <div id="BondsTransfer" style={{ height: '40%', marginTop: 30 }}>
        <AgGridBase
          columns={columns()}
          onGridReady={onGridReady}
          onSelectionChanged={handleSelectChange}
          rowData={customers}
          rowSelection={'multiple'}
          suppressRowClickSelection={true}
        />
      </div>

      {showView &&
        <BondsModal 
          rowData={selectedRow}
          show={showView}
          toggleShow={toggleView}
          title='Holding Transfer'
        />
      }

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm To Delete</Modal.Title>
        </Modal.Header>
          <Modal.Body>Are you sure you want to delete the selected transaction(s)?</Modal.Body>
          <Modal.Footer>
            <Button variant='primary' onClick={() => handleRequest(selectedRow)}>
              {modalLoading && <Loader/>}
              {!modalLoading ? 'Yes' : 'Requesting...'}
            </Button>
            <Button variant='primary' onClick={handleClose}>
              No
            </Button>
          </Modal.Footer>
      </Modal>
    </>
  );
}

export default BondTransfer