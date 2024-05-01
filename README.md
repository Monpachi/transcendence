# transcendence

Final project of the 42_cursus.
The Final Project was to make a website with a game called "Pong" including a match-making system, spectacting mode, and have people connected on it locally to play the game, chat, and have some "commands" over people as "kick, mute, invite..."


Discord Pong is an onepage website, looking exactly ( almost, ours is better) like discord (that's why the name).
- You have to create an account, you can have the 2fa authentification.

Once connected, as discord, you can modify your profil setting
- Your username
- Password
- Avatar ( try a gif as an avatar )
- You'll be see as online for you and for the others until you log out.

You can add people to your friend list with an interactive bar search.
If you alreay have some friends, you can decide to invite them to chat, kick them, block them, and more.

The subject asked us to make a game and add some settings, but we did extra.
- Pong can have background changed, the ball can also changed, the sound of the game can be modified.
- but our extra is that we have the latency of each player.
- If someone is not on the game anymore, but on another page , the player still in game receives a pop up saying that the other player will loose if not reconnected to the game ( with a timer ).
- The leaver also have an open pop up on the upper right to join the game if he wants.
- The bonus part ( there's no bonus part in transcendance, we just wanted to have more fun), we added ACHIEVEMENT. Win streak, lose streak, achieving gold rank, bronze, etc...


The chat use webSocket to be as fast as possible.
- The chat is in real time, instant, you can chat with anyone on the website friends or not.
- If you have the right of the chat ( owner, or admin) you can use some commands like "mute, kick, block, add admin, etc...".

There's many more ! 

Discord pong uses the following technologies:

React
React query
NestJS
PostgreSQL
