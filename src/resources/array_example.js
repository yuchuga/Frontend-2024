const list = [
  { name: 'Bike', price: 100 },
  { name: 'TV', price: 200 },
  { name: 'Book', price: 10 },
  { name: 'Album', price: 5 },
  { name: 'Phone', price: 500 },
  { name: 'Computer', price: 1000 }
]

const list2 = []

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

/** Find **/
const bookItem = list.find((item) => item.name === 'Book')
// console.log(bookItem)

/** Some - returns true/false if ANY element pass condition **/
const inexpensiveItem = list.some((item) => item.price < 100)
const phone = list.some((item) => item.name === 'Phone')
// console.log(inexpensiveItem)
// console.log(phone)

/** Every - returns true/false if EVERY element pass condition **/
const inexpensiveItems = list.every((item) => item.price < 500)
// console.log(inexpensiveItems)

/** Includes - returns true/false if ANY element pass condition **/
const check = list.map((item) => item.price).includes(500) 
// console.log(check)

/** Reduce - initialValue will be array[0] if not specified **/
const sum = list.reduce((acc, item) => {
  return item.price + acc
}, 0) 
// console.log(sum)

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
// console.log(newArray2)