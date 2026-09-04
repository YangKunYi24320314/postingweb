// 文件上传：走统一请求封装，返回的 data 里直接是 { url }。
// 注意：上传不属于接口契约（帖子无文件字段），这里仅作为图片/附件上传工具保留。
import request from './request'

export function uploadFile(formData) {
  return request.post('/upload', formData)
}
