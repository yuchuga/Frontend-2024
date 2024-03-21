//function compare strings
compareValues = (a, b) => {
  return a.bookCode.localeCompare(b.bookCode) //string comparison
};
return (a.bookCode < b.bookCode) ? -1 : (a.bookCode > b.bookCode) ? 1 : 0 //number comparison
//compare number 
return a.id - b.id //ascending
return b.id - a.id //descending

const sortData = array.sort((a, b) => a.key.localeCompare(b.key))
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

// rename column
const result = books.map(({ login, ...item }) => ({ ...item, trader: login }))

// compare 2 JSON array based on id column & return another column from one of the JSON array
const newUsers = users.map(obj1 => {
  const matchId = userGroups.find(obj2 => obj2.id === obj1.groupId)
  return { ...obj1, group: matchId.name }
})

const filterCurrencies = (obj) => {
  const { allowCurrencies, ...item } = obj // destructure key 'allowCurrencies' from object
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
  console.log('Result', result)
  return result
};

/** Remove Duplicates **/
const uniqueArr = (arr) => {
  return [...new Set(arr)]
};
const arr = [10, 3, 26, 7, 9, 3]
const newArr = uniqueArr(arr)
// console.log('new', newArr)

const uniqueArr2 = (arr) => {
  let result = []
  arr.forEach((item) => {
    if (!result.includes(item)) {
      result.push(item)
    }
  })
}

/** Reduce Method **/
const num = [11, 30, 22, 9, 19]
const sum = num.reduce((acc, curr) => acc + curr)
// console.log(sum)

/** Filter Method **/
const filterNum = num.filter(num => num > 20)
// console.log(filterNum)

/** Find Index Method **/
const index = arr.findIndex((item) => item > 20)
if (index >= 0) { //found in arr
  const temp = arr[index] += 1
  // console.log(temp)
}

/** Return new array of items from start to exclude end index & append behind array **/
const array = [1, 3, 5, 7, 9]
const fields = array.slice(0, 3)
const newFields = array.slice(3, array.length).concat(fields)
// console.log('newFields', newFields)
