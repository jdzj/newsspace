import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 36Kr 核心接口 - 包含快讯(Quick)与人气热榜(Renqi)
 */

// 1. 36Kr 快讯：直接请求官方网关 API
const quick = defineSource(async () => {
  const baseURL = "https://www.36kr.com"
  const apiUrl = "https://gateway.36kr.com/api/mis/nav/newsflash/flow"
  
  try {
    // 模拟官方标准的 Post Payload 请求参数
    const payload = {
      partner_id: "wap",
      timestamp: Date.now(),
      param: {
        pageSize: 30,
        pageEvent: 0
      }
    }

    const response = await myFetch<any>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
      },
      body: JSON.stringify(payload)
    })

    // 解析返回的 JSON 数据
    const items = response?.data?.itemList || []
    const news: NewsItem[] = []

    for (const item of items) {
      const templateData = item.templateData
      if (!templateData) continue

      const id = templateData.itemId
      const title = templateData.templateTitle
      const publishTime = templateData.publishTime

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

    return news
  } catch (error) {
    // 捕获异常，防止整个服务挂掉
    return []
  }
})

// 2. 36Kr 人气热榜：同样请求官方排行的 API 节点
const renqi = defineSource(async () => {
  const baseURL = "https://36kr.com"
  const apiUrl = "https://gateway.36kr.com/api/mis/nav/home/hot/rank"

  try {
    const payload = {
      partner_id: "wap",
      timestamp: Date.now(),
      param: {
        type: "renqi" // 设定获取人气榜，可选值还有 'zonghe' 等
      }
    }

    const response = await myFetch<any>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    })

    const items = response?.data?.itemList || []
    const articles: NewsItem[] = []

    for (const item of items) {
      const templateData = item.templateData
      if (!templateData) continue

      const id = templateData.itemId
      const title = templateData.templateTitle
      const author = templateData.authorName || "36Kr创投"
      const description = templateData.description || ""

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

    // 如果人气榜数据因特殊原因获取为空，自动调用快讯数据兜底
    return articles.length ? articles : quick()
  } catch (error) {
    return quick()
  }
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
