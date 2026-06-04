import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 网易新闻 - 综合新闻
 */
const news = defineSource(async () => {
  try {
    const baseURL = "https://news.163.com"
    const html: string = await myFetch(baseURL)
    const $ = cheerio.load(html)
    const newsItems: NewsItem[] = []

    // 获取首页主要新闻 - 尝试多个选择器
    $("a[href*='news.163.com']").each((_, element) => {
      const $element = $(element)
      const title = $element.attr("title") || $element.text()
      const url = $element.attr("href")

      if (title && url && title.trim().length > 0 && !newsItems.some(item => item.url === url)) {
        newsItems.push({
          id: url,
          title: title.trim().substring(0, 200),
          url: url.includes("http") ? url : `${baseURL}${url}`,
        })
      }
    })

    // 如果没有获取到足够的新闻，尝试API接口
    if (newsItems.length < 5) {
      try {
        const apiResponse: any = await myFetch(
          "https://c.m.163.com/uc/api/feed",
          {
            query: {
              version: 10,
              spjson: 1,
              channel: "news",
              pagesize: 30,
              pageno: 1,
            },
          }
        )

        if (apiResponse?.items?.length) {
          return apiResponse.items
            .slice(0, 30)
            .map((item: any) => ({
              id: item.docurl || item.title,
              title: item.title,
              url: item.docurl || "https://news.163.com/",
              pubDate: item.time,
              extra: {
                date: item.time ? new Date(item.time * 1000).getTime() : undefined,
              },
            }))
        }
      } catch {
        // API备用方案失败
      }
    }

    return newsItems.slice(0, 30)
  } catch (error) {
    console.error("Netease news fetch error:", error)
    return []
  }
})

/**
 * 网易新闻 - 每日轻松一刻
 */
const relaxing = defineSource(async () => {
  try {
    const apiUrl = "https://c.m.163.com/uc/api/feed"
    const response: any = await myFetch(apiUrl, {
      query: {
        version: 10,
        spjson: 1,
        channel: "ent",
        pagesize: 30,
        pageno: 1,
      },
    })

    if (response?.items?.length) {
      return response.items
        .slice(0, 30)
        .map((item: any) => ({
          id: item.docurl || item.title,
          title: item.title,
          url: item.docurl || "https://news.163.com/ent/",
          extra: {
            date: item.time ? new Date(item.time * 1000).getTime() : undefined,
          },
        }))
    }

    return []
  } catch (error) {
    console.error("Netease relaxing fetch error:", error)
    return []
  }
})

/**
 * 网易新闻 - 体育新闻
 */
const sports = defineSource(async () => {
  try {
    const apiUrl = "https://c.m.163.com/uc/api/feed"
    const response: any = await myFetch(apiUrl, {
      query: {
        version: 10,
        spjson: 1,
        channel: "sports",
        pagesize: 30,
        pageno: 1,
      },
    })

    if (response?.items?.length) {
      return response.items
        .slice(0, 30)
        .map((item: any) => ({
          id: item.docurl || item.title,
          title: item.title,
          url: item.docurl || "https://sports.163.com/",
          extra: {
            date: item.time ? new Date(item.time * 1000).getTime() : undefined,
          },
        }))
    }

    return []
  } catch (error) {
    console.error("Netease sports fetch error:", error)
    return []
  }
})

export default defineSource({
  "netease": news,
  "netease-news": news,
  "netease-relaxing": relaxing,
  "netease-sports": sports,
})
