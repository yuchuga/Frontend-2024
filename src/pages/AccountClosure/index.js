import React, { useState } from 'react'
import axios from 'axios'
import toastr from 'toastr'
import * as util from '@/utils/util'
import Loader from '@/components/Loader'
import PageTitle from '@/components/PageTitle'
import TableTitle from '@/components/TableTitle'
import { AgGridColumn } from 'ag-grid-react'
import { Button, Col, Form, Dropdown, Modal, Row } from 'react-bootstrap'
import { Endpoints, notifyConfig } from '@/utils/constants'
import { AgGridBase, filterParams } from '@/utils/grid-constants'

const AccountClosure = () => {

  const [, setGridApi] = useState(null)
  const [, setGridColumnApi] = useState(null)
  const [CIF, setCIF] = useState('')
  const [customers, setCustomers] = useState([])
  const [holdings, setHoldings] = useState([])

  const [loading, setLoading] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [show, setShow] = useState(false)

  const onGridReady = (params) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
    params.api.refreshCells()
  };

  const getCustomersAndHoldings = async () => {
    try {
      if (CIF) {
        setLoading(true)
        const PATH = Endpoints.ACCOUNT_CLOSURE + `/${CIF}`
        const response = await axios.get(PATH)
        console.log('GET API', response.data)
        const bondList = getBondsCustomer(response.data)
        const custodyList = getCustodyAccount(response.data)
        const cpty = await getCptyName(bondList) //to get value
        handleGrid(bondList, custodyList, cpty)
        getHoldings(bondList, custodyList)
        setCustomers(accountData)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  };

  const getHoldings = (bondList, custodyList) => {
    let holdingList = []
    const CIF = bondList[0].cif

    custodyList.forEach((item) => {
      const custAcc = item.custodyAccount
      const params = `/cif/${CIF}/custodyAccount/${custAcc}`
      const PATH = Endpoints.ACCOUNT_CLOSURE_HOLDINGS + params
      axios.get(PATH)
        .then((response) => {
          console.log('GET HOLDINGS API', response.data)
          const data = response.data.data.isin || []
          const result = [...holdingList, ...data] //concat 2 array of objects
          holdingList = result
          setHoldings(holdingList)
        })
        .catch((error) => {
          console.error(error)
        })
    })
  };

  const getCptyName = async (bondList) => {
    try {
      const CIF = bondList[0].cif
      const PATH = Endpoints.BOOKING_COUNTERPARTY + `/${CIF}`
      const response = await axios.get(PATH)
      console.log('GET CPTYNAME API', response.data)
      return response.data.gmpCptyName
    } catch (error) {
      console.error(error)
    }
  };

  const getBondsCustomer = (data) => {
    return data.map((item) => item).map((item) => item.bondsCustomer)
  };

  const getCustodyAccount = (data) => {
    return data.map((item) => item).map((item) => item.custAccount)
  };

  const handleGrid = (bondList, custodyList, cpty) => {
    const result = bondList.map((obj, i) => ({ ...obj, ...custodyList[i], cptyName: cpty }))
    console.log('handleGrid', result)
    setCustomers(result)
  };

  const handleNotify = (data) => {
    return (data.responseCode = '0000')
      ? toastr.success(data.remarks, 'Success', notifyConfig)
      : toastr.error(data.remarks, 'Error', notifyConfig)
  };

  const handleRequest = async () => {
    try {
      setModalLoading(true)
      const PATH = Endpoints.ACCOUNT_CLOSURE_REQUEST
      const response = await axios.post(PATH, customers)
      console.log('Create API', response)
      handleNotify(response.data)
      setModalLoading(false)
      handleClose()
    } catch (error) {
      console.error(error)
    }
  };

  const handleShow = () => setShow(true)
  const handleClose = () => setShow(false)

  const handleChangeCIF = (e) => setCIF(e.target.value)

  const customerTypeFormat = (params) => {
    return (params.value === 'P') ? 'Personal' : 'Non-Personal'
  };

  function columns() {
    return [
      <AgGridColumn 
        headerName='Custody Account'
        field='custodyAccount'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Cash Account'
        field='cashAccount'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Currency'
        field='currency'
        minWidth={50}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Customer Type'
        field='customerType'
        minWidth={50}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Customer Type Description'
        field='customerType'
        minWidth={200}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
        valueFormatter={customerTypeFormat}
      />,
      <AgGridColumn 
        headerName='Segment'
        field='segment'
        minWidth={50}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
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

  function holdingColumns() {
    return [
      <AgGridColumn 
        headerName='ISIN'
        field='isin'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Security Name'
        field='securityName'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />,
      <AgGridColumn 
        headerName='Series'
        field='series'
        minWidth={100}
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
        headerName='Available Quantity'
        field='availableQty'
        minWidth={100}
        editable={false}
        filter='agTextColumnFilter'
        filterParams={filterParams}
      />
    ]
  };

  return (
    <>
      <PageTitle title='Account Closure' />
      <Form>
        <Row>
          <Col xs={4}>
            <Form.Label>CIF</Form.Label>
            <Form.Control type='text' placeholder='Enter CIF' value={CIF} onChange={handleChangeCIF} />
          </Col>
          <Row>
            <Button 
              variant='primary' 
              style={{ marginTop: 30, marginLeft: 20 }}
              onClick={() => getCustomersAndHoldings(CIF)}
            >
              {loading && <Loader />}
              {!loading ? 'Search' : 'Searching...'}
            </Button>
          </Row>
        </Row>
      </Form>
      <Dropdown.Divider style={{ marginTop: 20 }} />

      <div id='AccountClosure_1' style={{ height: '30%', marginTop: 20 }}>
        <TableTitle title='Account' />
        <AgGridBase
          columns={columns()}
          onGridReady={onGridReady}
          rowData={customers}
          rowSelection={'single'}
          enableCopy={true}
        />
        <Dropdown.Divider style={{ marginTop: 25 }} />
      </div>

      <div id='AccountClosure_2' style={{ height: '30%', marginTop: -30 }}>
        <TableTitle title='Holdings' />
        <AgGridBase
          columns={holdingColumns()}
          onGridReady={onGridReady}
          rowData={holdings}
          rowSelection={'single'}
        />
      </div>
    
      <Button variant='primary' onClick={handleShow} style={{ marginTop: -50 }}>
        Close Account
      </Button>

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm To Close Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete the selected account?</Modal.Body>
        <Modal.Footer>
          <Button variant='primary' type='submit' onClick={() => handleRequest(customers)}>
            {modalLoading && <Loader/>}
            {!modalLoading ? 'Yes' : 'Deleting...'}
          </Button>
          <Button variant='primary' onClick={handleClose}>
            No
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AccountClosure