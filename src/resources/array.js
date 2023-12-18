//function compare strings
compareValues = (a, b) => {
  return a.bookCode.localeCompare(b.bookCode)
}
return (a.bookCode < b.bookCode) ? -1 : (a.bookCode > b.bookCode) ? 1 : 0

//function compare values
return a.id - b.id //ascending
return b.id - a.id //descending

const sortData = array.sort((a, b) => a.family.localeCompare(b.family))
const sortData2 = _.sortBy(array, ['key1', 'key2']) //lodash sort by 2 properties
const sortData3 = array.sort(compareValues) //functional
const sortData4 = array.sort(this.compareValues) //class

//sort by 2 property in an array of objects
const sortData5 = array.sort((a, b) => a.family.localeCompare(b.family) || a.title.localeCompare(b.title))

// convert nested JSON array to object
// userGroups - array, userGroupCustomers - property that have a nested JSON array
const newUserGroups = _.flatMap(userGroups, obj => {
  return obj.userGroupCustomers.map(item => (
    { ...obj, userGroupCustomers: item }
  ))
});

// edit a property value in 1st item of JSON array
const updateUsers = users.map(obj => {
  return obj.id === 9000001 ? { ...obj, groupId: 100 } : { ...obj }
})

// compare 2 JSON array based on id column & return another column from one of the JSON array
const newUsers = users.map(obj1 => {
  const matchId = userGroups.find(obj2 => obj2.id === obj1.groupId)
  return { ...obj1, group: matchId.name }
})

const filterCurrencies = (obj) => {
  const { allowCurrencies, ...item } = obj // destructure keys from object
  const filterCurrency = allowCurrencies.filter(item => item !== null)
  return {
    allowCurrencies: filterCurrency,
    ...item
  }
}

const getCustomerId = (parseData) => {
  const data = customerNames();
  const result = parseData.map((obj1) => {
    const matchCustomer = data.find((obj2) => obj2.customer === obj1.customer)
    return matchCustomer ? {...obj1, customerId: matchCustomer.customerId } : { ...obj1, customerId: '' }
  })
  return result
};

const customerNames = () => {
  const result = rows.current.map((obj1) => {
    const matchId = customerConfidentials.find((obj2) => obj2.customerId === obj1.customerId)
    return matchId ? {...obj1, customer: matchId.displayName} : { ...obj1, customer: '' }
  })
  return result
};

//Remove Duplicates
const uniqueArr = (arr) => {
  return [...new Set(arr)]
};

const uniqueArr2 = (arr) => {
  let result = []
  arr.forEach((item) => {
    if (!result.includes(item)) {
      result.push(item)
    }
  })
}