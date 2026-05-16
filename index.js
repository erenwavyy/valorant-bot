const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");

const TOKEN = "PUT_TOKEN";
const CLIENT_ID = "PUT_CLIENT_ID";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let users = {};

if (fs.existsSync("./users.json")) {
  users = JSON.parse(fs.readFileSync("./users.json"));
}

function saveUsers() {
  fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add Valorant account")
    .addStringOption(option =>
      option.setName("name")
      .setDescription("Valorant Name")
      .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("tag")
      .setDescription("Valorant Tag")
      .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show profile"),

  new SlashCommandBuilder()
    .setName("history")
    .setDescription("Show history")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Commands Loaded");
})();

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  try {

    if (interaction.commandName === "add") {

      const name = interaction.options.getString("name");
      const tag = interaction.options.getString("tag");

      users[interaction.user.id] = {
        name,
        tag,
        region: "ap"
      };

      saveUsers();

      return interaction.editReply(
        `✅ Added ${name}#${tag}`
      );
    }

    const user = users[interaction.user.id];

    if (!user) {
      return interaction.editReply(
        "❌ Add account first"
      );
    }

    if (interaction.commandName === "profile") {

      const mmr = await axios.get(
        `https://api.henrikdev.xyz/valorant/v1/mmr/ap/${encodeURIComponent(user.name)}/${encodeURIComponent(user.tag)}`
      );

      const data = mmr.data.data;

      const embed = new EmbedBuilder()
        .setTitle(`${user.name}#${user.tag}`)
        .setColor("Purple")
        .addFields(
          {
            name: "Rank",
            value: data.currenttierpatched || "Unknown"
          },
          {
            name: "RR",
            value: `${data.ranking_in_tier || 0}`
          }
        )
        .setFooter({
          text: "Made By Eren Wavy"
        });

      return interaction.editReply({
        embeds: [embed]
      });
    }

    if (interaction.commandName === "history") {

      const matches = await axios.get(
        `https://api.henrikdev.xyz/valorant/v3/matches/ap/${encodeURIComponent(user.name)}/${encodeURIComponent(user.tag)}`
      );

      const match = matches.data.data[0];

      const player = match.players.all_players.find(
        p => p.name.toLowerCase() === user.name.toLowerCase()
      );

      const win =
        (player.team.toLowerCase() === "red" && match.teams.red.has_won) ||
        (player.team.toLowerCase() === "blue" && match.teams.blue.has_won);

      const embed = new EmbedBuilder()
        .setTitle(`${win ? "🟢 WIN" : "🔴 LOSE"} | ${match.metadata.map}`)
        .setColor(win ? "Green" : "Red")
        .setImage(match.metadata.map_splash)
        .addFields(
          {
            name: "Mode",
            value: match.metadata.mode
          },
          {
            name: "KDA",
            value: `${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`
          }
        )
        .setFooter({
          text: "Made By Eren Wavy"
        });

      return interaction.editReply({
        embeds: [embed]
      });
    }

  } catch (err) {
    console.log(err);

    return interaction.editReply(
      "❌ Error Fetching Valorant Data"
    );
  }

});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag}`);
});

client.login(TOKEN);
