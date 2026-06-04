import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 体育新闻 - BBC体育和虎扑
 */
const sports = defineSource(async () => {
  try {
    // 方案1：虎扑体育热帖
    try {
      const baseURL = "https://www.hupu.com"
      const html: string = await myFetch(`${baseURL}/nba/`)
      const $ = cheerio.load(html)
      const newsItems: NewsItem[] = []

      // 获取虎扑NBA热帖
      $(".bbs-sl-item, .a-item-box, .item").each((_, element) => {
        const $element = $(element)
        const $link = $element.find("a").first()
        const title = $link.attr("title") || $link.text()
        const url = $link.attr("href")

        if (title && url && title.trim().length > 0 && !newsItems.some(item => item.url === url)) {
          const fullUrl = url.includes("http") ? url : `${baseURL}${url}`
          newsItems.push({
            id: fullUrl,
            title: title.trim().substring(0, 200),
            url: fullUrl,
          })
        }
      })

      if (newsItems.length > 5) {
        return newsItems.slice(0, 30)
      }
    } catch {
      // 虎扑爬取失败，继续尝试其他方案
    }

    // 方案2：新浪体育热点新闻
    try {
      const apiUrl = "https://api.sina.com.cn/sina_feeds?feednames=sports_top"
      const response: any = await myFetch(apiUrl)
      
      if (response?.result?.sports_top?.length) {
        return response.result.sports_top
          .filter((item: any) => item.title && item.url)
          .slice(0, 30)
          .map((item: any) => ({
            id: item.url,
            title: item.title.substring(0, 200),
            url: item.url,
            extra: {
              date: item.time_str ? new Date(item.time_str).getTime() : undefined,
            },
          }))
      }
    } catch {
      // 新浪API失败，继续尝试
    }

    // 方案3：虎扑NBA热门话题
    try {
      const html: string = await myFetch("https://bbs.hupu.com/nba")
      const $ = cheerio.load(html)
      const newsItems: NewsItem[] = []

      $(".title a, .t_a a").each((_, element) => {
        const $element = $(element)
        const title = $element.text()
        const url = $element.attr("href")

        if (title && url && title.trim().length > 0 && !newsItems.some(item => item.url === url)) {
          const fullUrl = url.includes("http") ? url : `https://bbs.hupu.com${url}`
          newsItems.push({
            id: fullUrl,
            title: title.trim().substring(0, 200),
            url: fullUrl,
          })
        }
      })

      if (newsItems.length > 5) {
        return newsItems.slice(0, 30)
      }
    } catch {
      // 虎扑论坛爬取失败
    }

    return []
  } catch (error) {
    console.error("Sports news fetch error:", error)
    return []
  }
})

export default defineSource({
  "sports": sports,
  "sports-hupu": sports,
})
