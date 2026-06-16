import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"
import type { NewsItem } from "@shared/types"

/**
 * FreeBuf 安全新闻信源 - 移动端官方高效 API 版
 */
export default defineSource(async () => {
  // 方案1：官方最新文章流 API (免反爬验证，返回标准 JSON)
  try {
    const apiUrl = "https://www.freebuf.com/fapi/frontend/home/article?page=1&limit=20"
    const response = await myFetch<any>(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
      }
    })

    const list = response?.data?.list || []
    if (list.length > 0) {
      return list.map((item: any) => {
        const id = item.id
        const title = item.post_title || item.title
        const link = `https://www.freebuf.com/articles/${item.category_name_en || 'news'}/${id}.html`
        
        return {
          id: String(id),
          title: title.trim(),
          url: link,
          pubDate: item.time,
          extra: {
            hover: item.post_excerpt || item.freebuf_story || "",
          }
        }
      }).filter((item: any) => item.id && item.title)
    }
  } catch (error) {
    // 方案1失败，自动尝试快讯线
  }

  // 方案2：FreeBuf 极速快讯 API 兜底
  try {
    const timelineUrl = "https://www.freebuf.com/fapi/frontend/timeline/list?page=1&limit=20"
    const response = await myFetch<any>(timelineUrl, {
      method: "GET"
    })

    const list = response?.data?.list || []
    return list.map((item: any) => {
      const id = item.id
      const title = item.title
      const link = item.url || `https://www.freebuf.com/`

      return {
        id: String(id),
        title: `[快讯] ${title.trim()}`,
        url: link,
        pubDate: item.time,
        extra: {
          hover: item.content || "",
        }
      }
    }).filter((item: any) => item.id && item.title)
  } catch (error) {
    // 所有方案失败
  }

  return []
})
