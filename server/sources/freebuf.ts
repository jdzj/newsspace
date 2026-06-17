import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"
import type { NewsItem } from "@shared/types"

/**
 * FreeBuf 安全新闻信源 - 基于最新可用API重写
 */
export default defineSource(async () => {
  // 方案1：使用官方最新文章流 API (经测试可用)
  try {
    // 从官网分析获得的新接口地址，增加了时间戳参数避免缓存
    const apiUrl = "https://www.freebuf.com/fapi/frontend/home/article?page=1&limit=20&_=" + Date.now()
    const response = await myFetch<any>(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.freebuf.com/"
      }
    })

    // 检查响应状态和数据结构
    if (response?.code === 200 && response?.data?.list) {
      const list = response.data.list
      if (list.length > 0) {
        return list.map((item: any) => {
          // 适配字段名：接口返回的是大写ID和post_title
          const id = item.ID || item.id
          const title = item.post_title || item.title
          // 构建正确的文章链接
          const category = item.category_name_en || 'news'
          const link = `https://www.freebuf.com/articles/${category}/${id}.html`
          
          return {
            id: String(id),
            title: title?.trim() || "无标题",
            url: link,
            pubDate: item.post_date || item.time,
            extra: {
              hover: item.post_excerpt || item.freebuf_story || "",
            }
          }
        }).filter((item: any) => item.id && item.title !== "无标题")
      }
    }
  } catch (error) {
    console.error("FreeBuf 文章接口获取失败，尝试快讯接口:", error)
  }

  // 方案2：使用快讯接口作为兜底
  try {
    const timelineUrl = "https://www.freebuf.com/fapi/frontend/timeline/list?page=1&limit=20&_=" + Date.now()
    const response = await myFetch<any>(timelineUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    })

    if (response?.code === 200 && response?.data?.list) {
      const list = response.data.list
      return list.map((item: any) => {
        const id = item.id
        const title = item.title
        // 快讯可能没有独立链接，使用主页或item中的url
        const link = item.url || `https://www.freebuf.com/`

        return {
          id: String(id),
          title: `[快讯] ${title?.trim() || "FreeBuf快讯"}`,
          url: link,
          pubDate: item.time,
          extra: {
            hover: item.content || "",
          }
        }
      }).filter((item: any) => item.id)
    }
  } catch (error) {
    console.error("FreeBuf 快讯接口也获取失败:", error)
  }

  // 所有方案失败，返回空数组
  return []
})
