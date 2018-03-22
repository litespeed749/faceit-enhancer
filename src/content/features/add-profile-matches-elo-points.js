/** @jsx h */
import { h } from 'dom-chef'
import select from 'select-dom'
import {
  getSelf,
  getPlayerMatches,
  getQuickMatch,
  getMatch
} from '../libs/faceit'
import { mapMatchesByIdAndExtendElo } from '../libs/matches'
import { getRoomId } from '../libs/match-room'
import { hasFeatureAttribute, setFeatureAttribute } from '../libs/dom-element'
import { calculateRatingChange } from '../libs/elo'

const FEATURE_ATTRIBUTE = 'elo-points'

export default async parentElement => {
  const matchHistoryElement = select(
    'div.js-match-history-stats',
    parentElement
  )

  if (!matchHistoryElement) {
    return
  }

  const self = await getSelf()
  const isFreeMembership = self.membership.type === 'free'
  const matches = await getPlayerMatches(self.guid, self.flag, 21)

  const matchesById = mapMatchesByIdAndExtendElo(matches)

  const matchElements = select.all(
    'tbody > tr.match-history-stats__row',
    matchHistoryElement
  )

  if (matchElements.length === 0) {
    return
  }

  if (hasFeatureAttribute(matchHistoryElement, FEATURE_ATTRIBUTE)) {
    return
  }
  setFeatureAttribute(matchHistoryElement, FEATURE_ATTRIBUTE)

  matchElements.forEach(async matchElement => {
    const accordionElement = matchElement.nextElementSibling
    const goToMatchRoomElement = select(
      'a[ui-sref*="app.root.matchroom.main.overview"]',
      accordionElement
    )
    const resultElement = select('td:nth-child(3) span', matchElement)

    const matchId = getRoomId(goToMatchRoomElement.getAttribute('href'))

    if (!matchesById[matchId]) {
      return
    }

    let { eloDiff, newElo, teamId, gameMode } = matchesById[matchId]

    if (!eloDiff) {
      let match

      if (gameMode.includes('5v5')) {
        match = await getQuickMatch(matchId)
      } else {
        match = await getMatch(matchId)
      }

      const { faction1Id, faction1Elo, faction2Elo, winner } = match
      const { winPoints, lossPoints } = calculateRatingChange(
        faction1Elo,
        faction2Elo
      )
      const isFaction1 = faction1Id === teamId
      const hasWon = winner === 'faction1' && isFaction1
      eloDiff = hasWon ? winPoints : lossPoints
    }

    const gainedElo = eloDiff > 0

    resultElement.textContent = `${resultElement.textContent} (${
      gainedElo ? '+' : ''
    }${eloDiff})`

    if (isFreeMembership) {
      return
    }

    const newEloElement = (
      <div style={{ color: '#fff', 'font-weight': 'normal' }}>
        New Elo: {newElo}
      </div>
    )

    resultElement.append(newEloElement)
  })
}