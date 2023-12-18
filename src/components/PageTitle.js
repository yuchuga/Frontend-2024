import React from 'react'
import { Dropdown } from 'react-bootstrap'

const PageTitle = (props) => {
  return (
    <div><h4>{props.title}</h4>
    <Dropdown.Divider style={{ marginTop: 20, marginBottom: 20 }} />
    </div>
  )
}

export default PageTitle