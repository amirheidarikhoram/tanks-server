# Distributed Server of the Tanks Game

This is the main repository of the server which is used for the tanks game. To see the codebase containing the logic for the game visit [Tanks Game](https://github.com/amirheidarikhoram/tanks).

## Game Overview

In this game, players take control of tanks and engage in combat within a distributed environment. Each player is required to start the game from a server dedicated to a specific region of the world. As players move their tanks around, the server dynamically identifies and connects them to suitable servers when they approach a specific distance from their initial world's boundaries. The game presents a dynamic and immersive experience where players can interact across different "sub-worlds."

## Challenges Faced

During the development of this game, several challenges were encountered, making it an exciting project to work on. Notable challenges include:

- **Cross-World Combat**: Implementing a shooting mechanism that allows players to engage in combat across adjacent worlds and hit their targets successfully.

- **Efficient Server-Side Simulation**: Ensuring efficient shoot action propagation and simulating shoot actions on the server side, which is written in JavaScript and has no knowledge of the underlying game engine.

- **Graceful Disconnection After Die Action Propagation**: Because players can only connect to a maximum of four servers while engaged in a battle, it is important to manage the "die" action with finesse.

## Future Plans

For the future development of this project, I plan to add a consensus protocol to decentralize this small-scale game. This new feature will enable users to host and manage their own servers, thereby addressing fault tolerance issues and making the game more robust and accessible.

## Project Status

As of now, this project is in its early stages. While the game is functional and demonstrates the key mechanics, there is potential for further development and improvement. I intend to share the game and server codebases for those interested in exploring and contributing to this project.

## Getting Started

To get started with the game, you should first run a game server. To do so, you must provide the required information for its northwest and southeast coordinates, along with a port. Optionally, you can also provide adjacent world addresses to establish connections.

First clone the repository and install its dependencies:
```bash
yarn
```
or
```bash
npm install
```

Then you can run a server with northeast set to (0,20) and southeast set to (20,0) listening on port 9000:
```bash
yarn start -n "0,20" -s "20,0" -p 9000
```
To add another server adjacent to the previous server you should run the command below:
```bash
yarn start -n "20,20" -s "40,0" -p 9001 -w "ws://localhost:9000"
```
This will give you a world containing two sub-worlds. Note that you can pass any values for northeast, southeast, port and world addresses (multiple) as long as they are valid.

Next you can build and run the game from Unity editor and connect to a specific world and play the game. You can also download game for GNU linux from [Tanks Game Repository](https://github.com/amirheidarikhoram/tanks).

## Contributing

This is a show case of a potentially bigger project and is not intended to expand and get developed any further. If you're offering any bug fix or improvement you can easily open an issues for further discussion.

## License

This project is licensed under the [MIT License](LICENSE.md).