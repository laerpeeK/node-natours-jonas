class APIFeatures {
  constructor(query, queryString) {
    this.query = query //mongo.query
    this.queryString = queryString
  }

  // 过滤关键字段
  filter() {
    // 1A) 过滤
    const queryObj = { ...this.queryString }
    const excludeFields = ['page', 'sort', 'limit', 'fields']
    excludeFields.forEach(el => delete queryObj[el])

    // 1B) 更好的过滤，比如 gt -> $gt; lte -> $lte
    let queryStr = JSON.stringify(queryObj)
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

    this.query = this.query.find(JSON.parse(queryStr))
    return this
  }

  // 排序
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ')
      this.query = this.query.sort(sortBy)
      // sort('price ratingsAverage')
    } else {
      // 默认排序为创建时间createdAt降序
      this.query = this.query.sort('-createdAt')
    }
    return this
  }

  // 设置查询字段
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ')
      this.query = this.query.select(fields)
    } else {
      // 默认不输出 -__v字段
      this.query = this.query.select('-__v')
    }
    return this
  }

  // 分页
  paginate() {
    const page = this.queryString.page * 1 || 1
    const limit = this.queryString.limit * 1 || 100
    const skip = (page - 1) * limit
    // page=1&limit=10
    this.query = this.query.skip(skip).limit(limit)
    return this
  }
}

module.exports = APIFeatures
