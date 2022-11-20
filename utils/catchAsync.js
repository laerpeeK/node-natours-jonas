// async的二次封装，避免各个API处理函数重复调用try, catch
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
