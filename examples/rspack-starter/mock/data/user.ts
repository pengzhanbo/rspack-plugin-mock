import Mock from 'mockjs'

interface User {
  account: string
  username: string
  age: number
}
export default {
  mark2022: {
    account: Mock.mock('@id()'),
    username: Mock.mock('@first()'),
    age: 20,
  },
  john996: {
    account: 'john996',
    username: 'john',
    age: 20,
  },
  // mark2021: {
  //   account: mock.mock('@id()'),
  //   username: mock.mock('@first()'),
  //   age: 20,
  // },
  mark2020: {
    account: Mock.mock('@id()'),
    username: Mock.mock('@first()'),
    age: 20,
  },
} as Record<string, User>
