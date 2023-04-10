module.exports = {
  name: "playerStart",
  execute: async(queue, track)=> {
    queue.metadata.channel.send(`Playing: ${track.title}`)
  }
}