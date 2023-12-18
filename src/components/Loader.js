import React from 'react'
import Spinner from 'react-bootstrap/Spinner'

const Loader = () => {
  return (
    <Spinner animation='border' role='status' size='sm' style={{ marginRight: 5 }} />
  )
}

export default Loader