import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toastr from 'toastr'
import * as util from '@/utils/util'
import Loader from '@/components/Loader'
import PageTitle from '@/components/PageTitle'
import ApprovalModal from './approvalModal'
import { AgGridColumn } from 'ag-grid-react'
import { Button, Container, Col, Modal, Row } from 'react-bootstrap'
import { AiFillEye, AiOutlineCheck, AiOutlineClose } from 'react-icons/ai'
import { Endpoints, notifyConfig } from '@/utils/constants'
import { AgGridBase, filterParams } from '@/utils/grid-constants'

const ApprovalTransfer = () => {

  const [gridApi, setGridApi] = useState(null)
  const [, setGridColumnApi] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [activeTrades, setActiveTrades] = useState([])

  const [, setLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showView, setShowView] = useState(false)

  useEffect(() => {
    getHoldingTransfer()
  }, []);

  const onGridReady = (params) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
    params.api.refreshCells()
  };

  const getHoldingTransfer = async () => {
    try {
      if (CIF) {
        setLoading(true)
        const PATH = Endpoints.BONDS_TRANSFER_REQUEST
        const response = await axios.get(PATH)
        console.log('GET API', response)
        const result = response.data.data
        setActiveTrades(result)
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
    } 
  };

  const handleApprove = async (selectedRow) => {
    try {
      selectedRow.forEach(async (item) => {
        setApproveLoading(true)
        const requestId = item.remarks
        const params = `/${requestId}/true`
        const PATH = Endpoints.BONDS_TRANSFER_APPROVE + params
        const response = await axios.put(PATH)
        console.log('Approve API', response)
        handleNotify(response.data)
        handleRefresh()
      });
      setApproveLoading(false)
      handleClose()
    } catch (error) {
      console.error(error)
    }
  };


  const handleReject = async (selectedRow) => {
    try {
      selectedRow.forEach(async (item) => {
        setApproveLoading(true)
        const requestId = item.remarks
        const params = `/${requestId}/false`
        const PATH = Endpoints.BONDS_TRANSFER_APPROVE + params
        const response = await axios.put(PATH)
        console.log('Reject API', response)
        handleNotify(response.data)
        handleRefresh()
      });
      setRejectLoading(false)
      handleClose()
    } catch (error) {
      console.error(error)
    }
  };

  const handleNotify = () => {
    return (data.responseCode = '0000')
      ? toastr.success(data.remarks, `Request ID - ${data.id}`, notifyConfig)
      : toastr.error(data.remarks, `Request ID - ${data.id}`, notifyConfig)
  };

  const handleRefresh = () => {
    gridApi.setRowData([])
    getHoldingTransfer()
    gridApi.setRowData(activeTrades)
  };

  const handleShow = () => {
    selectedRow && selectedRow.length > 0 && setShow(true)
  };

  const handleShowReject = () => {
    selectedRow && selectedRow.length > 0 && setShowReject(true)
  };

  const toggleView = () => setShowView(prev => !prev)

  const handleClose = () => {
    setShow(false)
    gridApi.deselectAll()
  };

  const handleCloseReject = () => {
    setShowReject(false)
    gridApi.deselectAll()
  };

  const handleSelectChange = () => {
    let record = gridApi.getSelectedRow()
    setSelectedRow(record)
  };

  const handleView = (params) => {
    const row = []
    const rowData = params.data
    row.push(rowData)
    setSelectedRow(row)
    toggleView()
  };

  const handleCheck = (params) => {
    params.node.selected && setShow(true)
  };

  const handleCross = (params) => {
    params.node.selected && setShowReject(true)
  };

  const nominalAmtFormat = (params) => {
    return params.value.toLocaleString()
  };

  const IconSet = (params) => {
    return (
      <div id='IconSet' style={{ margin: 0, cursor: 'pointer' }}>
        <AiFillEye style={{ fontSize: 20 }} onClick={() => handleView(params)} />
        <AiOutlineCheck style={{ fontSize: 20, marginLeft: 5 }} onClick={() => handleCheck(params)} />
        <AiOutlineClose style={{ fontSize: 20, marginLeft: 5 }} onClick={() => handleCross(params)} />
      </div>
    )
  }

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
        minWidth={100}
        editable={false}
        sortable={false}
        cellRendererFramework={IconSet}
      />,
      <AgGridColumn 
        headerName='Trade ID'
        field='tradeId'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Trade Type'
        field='tradeType'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Counterparty Name'
        field='cptyName'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='CIF'
        field='cif'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={customerTypeFormat}
      />,
      <AgGridColumn 
        headerName='Transaction Type'
        field='transType'
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
        headerName='Custody Account'
        field='custodyAccount'
        minWidth={125}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Cash Account'
        field='cashAccount'
        minWidth={125}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Currency'
        field='currency'
        minWidth={100}
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
        headerName='Value Date'
        field='valueDate'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={({ value }) => util.epochToLocalDate(value)}
      />,
      <AgGridColumn 
        headerName='Customer Price'
        field='customerPrice'
        minWidth={125}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Nominal Amount'
        field='nominalAmount'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={nominalAmtFormat}
      />,
      <AgGridColumn 
        headerName='Requested By'
        field='lockedBy'
        minWidth={125}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Requested On'
        field='lockedOn'
        minWidth={150}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={({ value }) => util.epochToLocalTime(value)}
      />
    ]
  };

  return (
    <>
      <PageTitle title='Holding Transfer Deletion Approval' />
      <Container fluid>
        <Row style={{ marginTop: 10 }}>
          <Col xs='auto'>
            <Button variant='primary' onClick={handleShow}>
              Approve
            </Button>
          </Col>
          <Col xs='auto'>
            <Button variant='secondary' onClick={handleShowReject}>
              Reject
            </Button>
          </Col>
        </Row>
      </Container>

      <div id='ApprovalTransfer' style={{ height: '40%', marginTop: 20 }}>
        <AgGridBase
          columns={columns()}
          onGridReady={onGridReady}
          onSelectionChnaged={handleSelectChange}
          rowData={activeTrades}
          rowSelection={'multiple'}
          rowMultiSelectionWithClick={true}
          suppressRowClickSelection={true}
        />
      </div>

      {showView &&
        <ApprovalModal 
          rowData={selectedRow}
          show={showView}
          toggleShow={toggleView}
          title='Holding Transfer Approval'
        />
      }

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm To Approve</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to approve the request?</Modal.Body>
        <Modal.Footer>
          <Button variant='primary' onClick={() => handleApprove(selectedRow)}>
            {approveLoading && <Loader/>}
            {!approveLoading ? 'Yes' : 'Approving...'}
          </Button>
          <Button variant='primary' onClick={handleClose}>
            No
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReject} onHide={handleCloseReject} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm To Reject</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to reject the request?</Modal.Body>
        <Modal.Footer>
          <Button variant='primary' onClick={() => handleReject(selectedRow)}>
            {rejectLoading && <Loader/>}
            {!rejectLoading ? 'Yes' : 'Rejecting...'}
          </Button>
          <Button variant='primary' onClick={handleCloseReject}>
            No
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ApprovalTransfer