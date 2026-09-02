// 分类 + 标签：给发布/筛选帖子用的字典接口。
import request from './request'

// 分类列表
export function getCategories() {
  return request.get('/categories')
}

// 标签列表（返回字符串数组，如 ['考研', '自习室']）
export function getTags() {
  return request.get('/tags')
}
