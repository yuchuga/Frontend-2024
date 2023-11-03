import React from 'react'
import { AgGridReact } from 'ag-grid-react'

export function AgGridBase (props) {
  const overlayTemplate = '<span>&lt;No results to display&gt;</span>'

  return (
    <div className='ag-theme-balham' style={{ width: '100%', height: 'calc(100% - 100px)' }}>
      <AgGridReact
        applyColumnDefOrder
        paginationPageSize={10}
        rowBuffer={20}
        enableBrowserTooltips={false}
        enableDomOrder={false}
        pagination={false}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        suppressColumnMoveAnimation={true}
        suppressColumnVirtualisation={true}
        suppressDragLeaveHidesColumns={true}
        onGridReady={props.onGridReady}
        onCellValueChanged={props.onCellValueChanged}
        onSelectionChanged={props.onSelectionChanged}
        rowData={props.rowData}
        rowMultiSelectWithClick={props.rowMultiSelectWithClick}
        rowSelection={props.rowSelection}
        suppressRowClickSelection={props.suppressRowClickSelection}
        overlayNoRowsTemplate={overlayTemplate}
        defaultColDef={{
          editable: false,
          enableCellChangeFlash: true,
          filterParams: { newRowsAction: 'keep' },
          floatingFilter: true,
          resizable: true,
          sortable: true,
          suppressMovable: true
        }}
      >
        {props.columns.map((col) => col)}
      </AgGridReact>
    </div>
  )
};

export const filterParams = {
  buttons: ['reset', 'apply'],
  closeOnApply: true,
  filterOptions: ['contains'],
  textFormatter: (value) => {
    if (value == null) return null
    if (!(typeof valye === 'string' || value instanceof String)) return String(value)

    return value
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/[àáâãäå]/g, 'a')
      .replace(/æ/g, 'ae')
      .replace(/ç/g, 'c')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/ñ/g, 'n')
      .replace(/[òóôõö]/g, 'o')
      .replace(/œ/g, 'oe')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/\W/g, '')
  }
};