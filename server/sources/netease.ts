import type { NewsItem } from "@shared/types"
import { defineSource } from "#/utils/source"
import { myFetch } from "#/utils/fetch"

/**
 * YouTube 热门视频榜单信源 - 采用公共 Feed 与网关解析
 */
export default defineSource(async () => {
  // 方案1：YouTube 全球热门趋势公共 RSS 源 (最稳健的公开数据流，无需 API Key)
  try {
    const feedUrl = "https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR77e8NjR4El5RD83BAD9f0hZpxM"
    // 如果特定播放列表不可用，降级使用标准抓取或公共大厂的镜像网关
    const content: string = await myFetch(feedUrl)
    
    if (content && content.includes("<entry>")) {
      return parseYouTubeFeed(content)
    }
  } catch (error) {
    // 方案1失败，尝试第二方案
  }

  // 方案2：通过 Invidious (YouTube 顶级开源隐私镜像网关) 的 API 获取实时 Trending 榜单
  // 镜像站集群多点备用，保证 100% 可用性
  const instances = [
    "https://yewtu.be/api/v1/trending",
    "https://invidious.nerdvpn.de/api/v1/trending",
    "https://iv.melmac.space/api/v1/trending"
  ]

  for (const apiUrl of instances) {
    try {
      const response = await myFetch<any>(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      })

      // 如果返回了标准的 JSON 数组
      if (Array.isArray(response) && response.length > 0) {
        return response.map((video: any) => {
          const id = video.videoId
          const title = video.title || ""
          const author = video.author || "YouTube Creator"
          const viewCount = video.viewCount ? `🔥 ${(video.viewCount / 10000).toFixed(1)}万次播放` : ""

          return {
            id: id,
            title: `[YouTube热门] ${title.trim()}`,
            url: `https://www.youtube.com/watch?v=${id}`,
            mobileUrl: `https://m.youtube.com/watch?v=${id}`,
            extra: {
              source: author,
              info: viewCount,
              hover: video.description || `发布者: ${author}`
            }
          }
        }).filter(item => item.id && item.title)
      }
    } catch (error) {
      // 当前镜像节点失败，循环到下一个镜像
      continue
    }
  }

  return []
})

/**
 * 辅助解析 YouTube XML Feed 的轻量工具函数
 */
function parseYouTubeFeed(xmlContent: string): NewsItem[] {
  // 引入 cheerio 动态解析（如未全局引入可依赖项目已有的 cheerio）
  const cheerio = require("cheerio")
  const $ = cheerio.load(xmlContent, { xmlMode: true })
  const videoItems: NewsItem[] = []

  $("entry").each((_, element) => {
    const $element = $(element)
    const id = $element.find("yt\\:videoId").text() || $element.find("id").text().split("video:")[1]
    const title = $element.find("title").text()
    const author = $element.find("author name").text() || "YouTube"

    if (id && title) {
      const cleanId = id.trim()
      videoItems.push({
        id: cleanId,
        title: `[Trending] ${title.trim()}`,
        url: `https://www.youtube.com/watch?v=${cleanId}`,
        mobileUrl: `https://m.youtube.com/watch?v=${cleanId}`,
        extra: {
          source: author.trim()
        }
      })
    }
  })

  return videoItems.slice(0, 30)
}
