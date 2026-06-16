import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * 航天与太空探索新闻 - 聚合权威信源 (NASA 官方 / NASA-SpaceX 任务 / 商业航天新闻)
 */
export default defineSource(async () => {
  // 方案1：NASA 官方最新发布 (最权威、最高频的全球航天与科研动态)
  try {
    const html: string = await myFetch("https://www.nasa.gov/rss-feeds/")
    // 如果官方 RSS 主页聚合可用，或使用具体的标准 XML 地址：
    const rssUrl = "https://www.nasa.gov/feed/" 
    const content: string = await myFetch(rssUrl)
    if (content && content.includes("<item>")) {
      return parseRssFeeds(content, "NASA Latest")
    }
  } catch (error) {
    // NASA 核心源请求失败，自动降级
  }

  // 方案2：NASA 专项 SpaceX 任务动态 (专门追踪 SpaceX 龙飞船、商业火箭发射及空间站补给任务)
  try {
    const content: string = await myFetch("https://blogs.nasa.gov/spacex/feed/")
    if (content && content.includes("<item>")) {
      return parseRssFeeds(content, "NASA-SpaceX")
    }
  } catch (error) {
    // 降级到下一个商业航天源
  }

  // 方案3：Spaceflight Now (全球著名的商业航天发射、Starship、猎鹰火箭实时跟踪新闻媒体)
  try {
    const content: string = await myFetch("https://spaceflightnow.com/feed/")
    if (content && content.includes("<item>")) {
      return parseRssFeeds(content, "Spaceflight Now")
    }
  } catch (error) {
    // 所有方案均失败
  }

  return []
})

/**
 * 通用航天 RSS XML 解析工具函数
 */
function parseRssFeeds(xmlContent: string, sourceName: string): NewsItem[] {
  const $ = cheerio.load(xmlContent, { xmlMode: true })
  const newsItems: NewsItem[] = []

  $("item").each((_, element) => {
    const $element = $(element)
    let title = $element.find("title").text()
    const url = $element.find("link").text() || $element.find("guid").text()

    if (title && url && title.trim().length > 0) {
      const cleanUrl = url.trim()
      
      // 给标题加上来源前缀，方便在前端一眼看出是 NASA 还是 SpaceX 的动态
      let displayTitle = title.trim()
      if (!displayTitle.startsWith(`[${sourceName}]`)) {
        displayTitle = `[${sourceName}] ${displayTitle}`
      }

      // 过滤和去重
      if (!newsItems.some(item => item.url === cleanUrl)) {
        newsItems.push({
          id: cleanUrl,
          title: displayTitle.substring(0, 200),
          url: cleanUrl,
          mobileUrl: cleanUrl, // 完美兼容原网易源的字段，防止前端报 undefined
          extra: {
            source: sourceName,
          },
        })
      }
    }
  })

  // 返回前 30 条最新的太空探索新闻
  return newsItems.slice(0, 30)
}
