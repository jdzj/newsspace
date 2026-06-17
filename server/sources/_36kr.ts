import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 36Kr 数据源 - 基于最新可用API重写
 * 包含快讯(Quick)与热门文章(Hot)
 */

// 1. 36Kr 快讯：使用新的资讯流接口
const quick = defineSource(async () => {
  const baseURL = "https://www.36kr.com"
  // 新接口地址，通过分析官网请求获得
  const apiUrl = "https://www.36kr.com/api/newsflash/flow"

  try {
    const response = await myFetch<any>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        // 参数根据实际接口要求调整，以下为常见必要参数
        pageSize: 30,
        pageNum: 1
      })
    })

    // 根据新接口返回结构解析数据
    const items = response?.data?.list || response?.data?.itemList || []
    const news: NewsItem[] = []

    for (const item of items) {
      // 适配多种可能的字段名
      const id = item.id || item.itemId || item.newsId
      const title = item.title || item.templateTitle || item.newsTitle
      const publishTime = item.publishTime || item.createTime || item.time

      if (id && title) {
        news.push({
          url: `${baseURL}/newsflashes/${id}`,
          title: title.trim(),
          id: String(id),
          extra: {
            date: publishTime ? new Date(publishTime).getTime() : Date.now(),
          }
        })
      }
    }

    return news.length > 0 ? news : [] // 如果无数据，返回空数组
  } catch (error) {
    console.error("36Kr 快讯获取失败:", error)
    return []
  }
})

// 2. 36Kr 热门文章：使用新的热门榜单接口
const hot = defineSource(async () => {
  const baseURL = "https://www.36kr.com"
  // 热门榜单新接口
  const apiUrl = "https://www.36kr.com/api/hot/rank"

  try {
    const response = await myFetch<any>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        type: "hot", // 或 "renqi"，根据实际调整
        limit: 30
      })
    })

    const items = response?.data?.list || response?.data?.itemList || []
    const articles: NewsItem[] = []

    for (const item of items) {
      // 适配多种字段结构
      const id = item.id || item.itemId || item.articleId
      const title = item.title || item.templateTitle || item.articleTitle
      const author = item.authorName || item.author || "36氪"
      const description = item.description || item.summary || ""

      if (id && title) {
        articles.push({
          url: `${baseURL}/p/${id}`,
          title: title.trim(),
          id: String(id),
          extra: {
            info: `作者: ${author}`,
            hover: description.trim()
          }
        })
      }
    }

    // 如果热门数据获取失败，使用快讯数据作为兜底
    return articles.length > 0 ? articles : await quick()
  } catch (error) {
    console.error("36Kr 热门获取失败，使用快讯兜底:", error)
    return await quick()
  }
})

// 导出数据源，保留原有名称以便兼容
export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": hot,      // 人气榜映射到热门
  "36kr-hot": hot,        // 新增热门榜名称
})
