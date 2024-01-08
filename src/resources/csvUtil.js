import _ from 'lodash'
import { jsonToCSV, readString } from 'react-papaparse'
import { useNavigate } from 'react-router'

// convert JSON to CSV
const exportCSV = (data, filename) => {
  const file = new Blob([data], { type: 'text/csv' }) //create blob object
  const url = URL.createObjectURL(file) //pass blob object into object url
  const link = document.createElement("a") //create html anchor element
  link.href = url //set href attribute to blob url
  link.download = filename //set download attribute to filename
  document.body.appendChild(link) //append element to html body
  link.click();

  setTimeout(() => { //unmount 
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, 0)
};

const handleExport = () => {
  const newConfigs = configs.map(({ bidSpreads, askSpreads, minimumSpreads }) => {
    return {
      ...item,
      bidMarkup: bidSpreads,
      askMarkup: askSpreads,
      finalTraderPriceMinimum: minimumSpreads
    }
  })

  const result = newConfigs.map(item => flat.flatten(item))
  const config = { quotes: true, columns: headers} 
  const csvData = jsonToCSV(result, config)
  exportCSV(csvData, `FwdSpread.csv`)
};


const handleImport = (file) => {
  const read = new FileReader()
  read.readAsBinaryString(file)
  read.onload = () => {
    importCSV(read.result)
  }
};

const importCSV = (csvString) => {
  const csvKeys = {}
  const configOptions = {
    header: true, 
    dynamicTyping: true,
    skipEmptyLines: true,
    delimiter: ","
  };

  const parseResults = readString(csvString, configOptions)
  const parseData = parseResults.data
  const parseError = parseResults.errors
  const parseFields = parseResults.meta.fields
  const rowData = [ {obj1}, {obj2} ]

  if (parseError && parseError.length > 0) {
    notifyError(`Import failed - ${parseError[0].message}!`)
    return
  };

  if (parseData || parseData.length === 0) {
    notifyError('Import failed - No data found')
    return
  };

  if (parseData.length > 10000) {
    notifyError('Import failed - Exceed max data limit')
    return
  };

  parseData.forEach((item) => _.merge(csvKeys, item)) // _.merge(destination, source), return last object
  if (Object.keys(csvKeys).length !== 10) {
    notifyError('Import failed - Incorrect fields found')
    return
  };

  const csvData = parseData.map((item) => flat.unflatten(item))
  const viewHeaders = validateEachKey(rowData, parseFields)
  const equalKeys = parseFields.every((item) => viewHeaders.includes(item)) //test every item in parseFields 
  
  if (equalKeys) {
    createImport(csvData)
  }
};

const validateEachKey = (rowData, parseFields) => {
  const headers = handleHeaders(rowData)
  for (const key of parseFields) {
    if (!headers.incudes(key)) {
      notifyError(`Import failed - Unrecognised field: ${key}`)
    }
  }
  return headers
}

const createImport = async (data) => {
  await api.createConfig(data, type)
    .then(() => {
      notifySuccess('Import successful')
      handleRefresh()
    })
    .catch((error) => {
      console.error(error)
    })
};


const handleHeaders = () => {
  let maxKeys = 0
  let maxKeysIndex = -1

  // Find object with the most keys
  for (let i = 0; i < jsonArray.length; i++) {
    const numKeys = Object.keys(jsonArray[i]).length
    if (numKeys > maxKeys) {
      maxKeys = numKeys
      maxKeysIndex = i
      return maxKeysIndex
    }
  };

  const headers = Object.keys(jsonData[maxKeysIndex])
  console.log('Headers', headers) //ensure array of strings format
  return headers
};


const navigate = useNavigate()

const handleRefresh = () => {
  window.location.reload() //javascript
  navigate(0) //react-router-dom
  Router.refresh() //next.js
  // navigate(-1) //go back in browser
};