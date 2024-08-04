import type { MockRequest } from 'rspack-plugin-mock/helper'
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/socket.io',
  ws: true,
  setup(wss) {
    wss.on('connection', (ws, _req: MockRequest) => {
      // req.query
      // req.params
      // req.getCookie
      ws.on('message', (raw) => {
        const message = JSON.parse(String(raw))

        // eslint-disable-next-line no-console
        console.log(message)
      })
      ws.send(JSON.stringify({ type: 'connected123' }))
    })
  },
})
