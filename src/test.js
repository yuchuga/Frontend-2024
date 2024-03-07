const person = {
  name: 'John',
  age: 30,
  location: 'Dubai'
};

const num = [11, 30, 22, 9, 19]
const sum = num.reduce((acc, curr) => acc + curr)
// console.log(sum)

const filterNum = num.filter(num => num > 20)
// console.log(filterNum)

/* Remove Duplicates */
const uniqueArr = (arr) => {
  return [...new Set(arr)]
};

const arr = [10, 3, 26, 7, 9, 3]
const newArr = uniqueArr(arr)
// console.log('new', newArr)
const index = arr.findIndex((item) => item > 20)
// console.log(index)
if (index >= 0) { //found in arr
  const temp = arr[index] += 1
  // console.log(temp)
}

const array = [1, 3, 5, 7, 9]
const fields = array.slice(0, 3)
const newFields = array.slice(3, array.length).concat(fields)
// console.log('newFields', newFields)

/** Callback Functions 
  Accepts functions as arguments & invoke/call it in outer function
  Run async operations as code runs sequentially in javascript
**/
// setTimeout(() => { 
//   console.log('Message is shown after 3 seconds')
// }, 3000);

const circle = {
  radius: 20,
  diameter() {
    return this.radius*2
  },
  perimeter: function() { //note: return NaN for arrow function
    return 2*Math.PI*this.radius
  }
}
// console.log(circle.diameter()) //40
// console.log(circle.perimeter()) //125.6

/* Find missing number in array size N using arithmetic progression formula n(n+1)/2 */
const findMissingNumber = (array, length) => {
  let result = Math.floor((length + 1) * (length + 2) / 2) 
  for (let i = 0; i < length; i++) {
    result -= array[i]
  }
  return result
};

const findMissingNumber2 = (array) => {
  const n = array.length + 1
  const expectSum = (n * (n + 1)) / 2
  const actualSum = array.reduce((acc, curr) => acc + curr)
  return expectSum - actualSum
};

const array1 = [1, 2, 4, 6, 3, 7, 8]
const missingNumber = findMissingNumber2(array1)
// console.log('missingNumber', missingNumber) //5
