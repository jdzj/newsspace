import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 网易新闻 - 最新社会新闻
 */
const news = defineSource(async () => {
  try {
    const baseURL = "https://news.163.com"
    
    // 使用网易新闻RSS源 - 更稳定
    try {
      const rssUrl = "https://www.chinanews.com.cn/rss/scroll-news.xml"
      const html: string = await myFetch(rssUrl)
      const $ = cheerio.load(html)
      const newsItems: NewsItem[] = []

      // 获取最新新闻列表
      $(".tit a, .txt-box a, .list-text a").each((_, element) => {
        const $element = $(element)
        const title = $element.attr("title") || $element.text()
        const url = $element.attr("href")

        if (title && url && title.trim().length > 2 && !newsItems.some(item => item.url === url)) {
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
      // HTML爬取失败，继续尝试其他方案
    }

    // 备用方案：澎湃新闻热榜（中国最新新闻）
    try {
      const apiUrl = "https://api.thepaper.cn/v3/homepageV2?isSql=1&device=pc&web_version=pc&cmsId=26"
      const response: any = await myFetch(apiUrl)
      
      if (response?.data?.items?.length) {
        return response.data.items
          .filter((item: any) => item.title && item.contentUrl)
          .slice(0, 30)
          .map((item: any) => ({
            id: item.contentUrl || item.title,
            title: item.title,
            url: item.contentUrl || "https://www.thepaper.cn/",
            extra: {
              date: item.createTime ? new Date(item.createTime).getTime() : undefined,
            },
          }))
      }
    } catch {
      // API备用方案失败
    }

    return []
  } catch (error) {
    console.error("Netease news fetch error:", error)
    return []
  }
})

export default defineSource({
  "netease": news,
  "netease-news": news,
})
