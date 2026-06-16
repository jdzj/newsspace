import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 体育新闻 - 聚合国际与国内稳定信源 (BBC / 路透社 / 新浪体育)
 */
const sports = defineSource(async () => {
  // 方案1：BBC 体育新闻 (全球最稳定的体育 RSS 之一)
  try {
    const html: string = await myFetch("https://feeds.bbci.co.uk/sport/rss.xml")
    if (html && html.includes("<item>")) {
      return parseRssFeeds(html, "BBC Sport")
    }
  } catch (error) {
    // BBC 失败，继续尝试下一个
  }

  // 方案2：路透社体育新闻 (Reuters Sports)
  try {
    const html: string = await myFetch("https://www.reutersagency.com/feed/?best-topics=sports&post_type=best")
    if (html && html.includes("<item>")) {
      return parseRssFeeds(html, "Reuters Sports")
    }
  } catch (error) {
    // 路透社失败，继续尝试下一个
  }

  // 方案3：新浪体育综合热点 (国内备用 RSS，比直接爬网页更稳定)
  try {
    const html: string = await myFetch("https://feed.mix.sina.com.cn/blacksilvers/feed/sports/index.xml")
    if (html && html.includes("<item>")) {
      return parseRssFeeds(html, "新浪体育")
    }
  } catch (error) {
    // 所有方案均失败
  }

  return []
})

/**
 * 通用 RSS XML 解析工具函数
 */
function parseRssFeeds(xmlContent: string, sourceName: string): NewsItem[] {
  const $ = cheerio.load(xmlContent, { xmlMode: true })
  const newsItems: NewsItem[] = []

  $("item").each((_, element) => {
    const $element = $(element)
    const title = $element.find("title").text()
    const url = $element.find("link").text() || $element.find("guid").text()
    const pubDate = $element.find("pubDate").text()

    if (title && url && title.trim().length > 0) {
      const cleanUrl = url.trim()
      
      // 避免重复项
      if (!newsItems.some(item => item.url === cleanUrl)) {
        newsItems.push({
          id: cleanUrl,
          title: title.trim().substring(0, 200),
          url: cleanUrl,
          extra: {
            source: sourceName,
            date: pubDate ? new Date(pubDate).getTime() : undefined,
          },
        })
      }
    }
  })

  return newsItems.slice(0, 30)
}

export default defineSource({
  "sports": sports,
  "sports-hupu": sports, // 保持别名兼容性
})
