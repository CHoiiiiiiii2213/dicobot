const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs'); // 파일 시스템 모듈 사용

// 봇 설정
const TOKEN = 'MTMzMTY3ODY5MzgwNTkyMDM2OA.GDFGgp.UReaxqum71kwJnNiRdOwRqzjuKd9AuluAvfDxA'; // 디스코드 개발자 포털에서 복사한 봇 토큰
const CLIENT_ID = '1331678693805920368'; // 디스코드 개발자 포털에서 확인한 클라이언트 ID

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// 랭킹 데이터 로드 또는 초기화
const RANKINGS_FILE = './rankings.json';
let rankings = {};
if (fs.existsSync(RANKINGS_FILE)) {
    rankings = JSON.parse(fs.readFileSync(RANKINGS_FILE, 'utf-8'));
}

// 슬래시 명령어 정의
const commands = [
    {
        name: '토너먼트',
        description: 'Generates a tournament bracket',
        options: [
            {
                name: '참가자수',
                type: 4, // INTEGER
                description: 'Number of participants',
                required: true,
            },
        ],
    },
    {
        name: '우승자',
        description: 'Register the winner of the tournament',
        options: [
            {
                name: '이름',
                type: 3, // STRING
                description: 'Winner name',
                required: true,
            },
        ],
    },
    {
        name: '랭킹',
        description: 'Show the current tournament rankings',
    },
];

// 슬래시 명령어 등록
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log('디스코드 봇이 준비되었습니다!');
    try {
        console.log('슬래시 명령어를 등록 중...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error('슬래시 명령어 등록 중 오류 발생:', error);
    }
});

// 슬래시 명령어 처리
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === '토너먼트') {
        const 참가자수 = interaction.options.getInteger('참가자수');

        if (참가자수 < 2) {
            await interaction.reply('참가자는 최소 2명 이상이어야 합니다!');
            return;
        }

        await interaction.reply(
            `참가자 수는 ${참가자수}명입니다. 이름을 쉼표(,)로 구분하여 입력해주세요. 예: 이름1, 이름2, 이름3...`
        );

        const filter = (response) => response.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({
            filter,
            time: 60000, // 60초 동안 대기
        });

        collector.on('collect', async (message) => {
            const 참가자들 = message.content.split(',').map((name) => name.trim());

            if (참가자들.length !== 참가자수) {
                await message.reply(
                    `참가자 수가 일치하지 않습니다! ${참가자수}명을 입력해야 합니다. 다시 입력해주세요.`
                );
                return;
            }

            collector.stop(); // 입력이 완료되면 메시지 수집 종료

            const shuffledParticipants = 참가자들.sort(() => Math.random() - 0.5);

            let byePlayer = null;
            if (shuffledParticipants.length % 2 !== 0) {
                byePlayer = shuffledParticipants.pop();
            }

            const matches = [];
            for (let i = 0; i < shuffledParticipants.length; i += 2) {
                matches.push(`${shuffledParticipants[i]} vs ${shuffledParticipants[i + 1]}`);
            }

            let result = matches.join('\n');
            if (byePlayer) {
                result += `\n부전승: ${byePlayer}`;
            }

            await interaction.channel.send(`토너먼트 대진표:\n${result}`);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.channel.send('시간이 초과되었습니다. 명령어를 다시 입력해주세요.');
            }
        });
    }

    if (interaction.commandName === '우승자') {
        const winner = interaction.options.getString('이름');

        if (!rankings[winner]) {
            rankings[winner] = 0;
        }
        rankings[winner] += 1;

        fs.writeFileSync(RANKINGS_FILE, JSON.stringify(rankings, null, 2), 'utf-8');

        await interaction.reply(`우승자 "${winner}"가 등록되었습니다! 현재 우승 횟수: ${rankings[winner]}회`);
    }

    if (interaction.commandName === '랭킹') {
        if (Object.keys(rankings).length === 0) {
            await interaction.reply('현재 등록된 랭킹이 없습니다.');
            return;
        }

        const rankingList = Object.entries(rankings)
            .sort(([, a], [, b]) => b - a)
            .map(([name, wins], index) => `${index + 1}. ${name} - ${wins}회 우승`)
            .join('\n');

        await interaction.reply(`현재 랭킹:\n${rankingList}`);
    }
});

// 봇 실행
client.login(TOKEN);
