const list = [
  { name: 'Bike', price: 100 },
  { name: 'TV', price: 200 },
  { name: 'Book', price: 10 },
  { name: 'Album', price: 5 },
  { name: 'Phone', price: 500 },
  { name: 'Computer', price: 1000 }
];

const list2 = [];

const arr = [10, 3, 26, 7, 9, 3];
const num = [11, 30, 22, 9, 19]

//No Mutation of Original Array
/** Map **/
const names = list.map((item) => item.name)
// console.log(names)

/** forEach - no return statement **/
list.forEach((item) => {
  // console.log(item.name)
  list2.push(item.name)
})
// console.log(list2)

/** Filter **/
const filteredList = list.filter((item) => item.price > 100)
// console.log(filteredList)
const filterNum = num.filter(num => num > 20)

/** Find **/
const bookItem = list.find((item) => item.name === 'Book')
// console.log(bookItem)

/** Find Index **/
const index = arr.findIndex((item) => item > 20) //index of 1st element satisfy condition
if (index >= 0) { //found in arr
  const temp = arr[index] += 1
  // console.log(temp) //27
}

/** Some **/
const inexpensiveItem = list.some((item) => item.price < 100) //returns true or false if ANY element pass conditio
const phone = list.some((item) => item.name === 'Phone')
// console.log(inexpensiveItem)
// console.log(phone)

/** Every **/
const inexpensiveItems = list.every((item) => item.price < 500) //returns true or false if EVERY element pass condition
// console.log(inexpensiveItems)

/** Includes **/
const check = list.map((item) => item.price).includes(500) //returns true or false if ANY element pass condition
// console.log(check)

/** Reduce **/
const sum = list.reduce((acc, currentItem) => {
  console.log('acc', acc)
  console.log('curr', currentItem.price) 
  return currentItem.price + acc
}, 0) 
/* currentValue = array[0] & acc = 0 if initial value specified. 
  Otherwise currentValue = array[1] & acc value = arr[0]
*/
// console.log(sum)

const total = num.reduce((acc, curr) => acc + curr)
console.log(total)

/** For Loop **/
const calculateSum = (list) => {
  let total = 0
  for (let i = 0; i < list.length; i++){
    total += list[i].price
  }
  // console.log(total)
  return total
}
calculateSum(list);

const alphabet = ['A', 'B', 'C', 'D', 'E']
const numbers = [1, 2, 3, 4, 5]
// destructure array 
const [a,, c, ...rest] = alphabet
// console.log(c)

// concat 2 arrays
const newArray = [...alphabet, ...numbers]
const newArray2 = alphabet.concat(numbers)
console.log(newArray2)