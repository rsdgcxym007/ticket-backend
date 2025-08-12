import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ZoneService } from '../zone/zone.service';
import { CreateZoneDto } from '../zone/dto/create-zone.dto';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

const generateString = () => randomUUID();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const zoneService = app.get(ZoneService);

  const zones: CreateZoneDto[] = [
    {
      name: 'back-left',
      seatMap: [
        ['470', '471', '472', '473', '474', '475', '476', '477', '478'],
        [null, '451', '452', '453', '454', '455', '456', '457', '458'],
        [null, null, '435', '436', '437', '438', '439', '440', '441'],
        [null, null, null, '421', '422', '423', '424', '425', '426'],
        [null, null, null, null, '409', '410', '411', '412', '413'],
        [null, null, null, null, null, '401', '402', '403', '404'],
      ],
    },
    {
      name: 'back-right',
      seatMap: [
        ['482', '483', '484', '485', '486', '487', '488', '489', '490', '491'],
        ['461', '462', '463', '464', '465', '466', '467', '468', null, null],
        ['444', '445', '446', '447', '448', '449', '450', null, null, null],
        ['429', '430', '431', '432', '433', '434', null, null, null, null],
        ['416', '417', '418', '419', '420', null, null, null, null, null],
        ['407', '408', null, null, null, null, null, null, null, null],
      ],
    },
    {
      name: 'left',
      seatMap: [
        ['386', null, null, null, null, null, null, null],
        ['385', '363', '343', null, null, null, null, null],
        ['384', '362', '342', '324', null, null, null, null],
        ['383', '361', '341', '323', null, null, null, null],
        ['382', '360', '340', '322', null, null, null, null],
        ['381', '359', '339', '321', null, null, null, null],
        ['380', '358', '338', '320', '309', null, null, null],
        ['379', '357', '337', '319', '308', null, null, null],
        ['378', '356', '336', '318', '307', null, null, null],
        ['377', '355', '335', '317', '306', null, null, null],
        ['376', '354', '334', '316', '305', null, null, null],
        ['375', null, null, null, null, null, null, null],
        ['374', '353', '333', '315', '304', null, null, null],
        ['373', '352', '332', '314', '303', null, null, null],
        ['372', '351', '331', '313', '302', null, null, null],
        ['371', '350', '330', '312', '301', null, null, null],
        ['370', '349', '329', '311', null, null, null, null],
        ['369', '348', '328', '310', null, null, null, null],
        ['368', '347', '327', null, null, null, null, null],
        ['367', '346', '326', null, null, null, null, null],
        ['366', '345', '325', null, null, null, null, null],
        ['365', '344', null, null, null, null, null, null],
        ['364', null, null, null, null, null, null, null],
      ],
    },
    {
      name: 'right',
      seatMap: [
        [null, null, null, null, null, '124', '143', '163'],
        [null, null, null, null, null, '125', '144', '164'],
        [null, null, null, null, null, '126', '145', '165'],
        [null, null, null, null, null, '127', '146', '166'],
        [null, null, null, null, '110', '128', '147', '167'],
        [null, null, null, null, '111', '129', '148', '168'],
        [null, null, null, '101', '112', '130', '149', '169'],
        [null, null, null, '102', '113', '131', '150', '170'],
        [null, null, null, '103', '114', '132', '151', '171'],
        [null, null, null, '104', '115', '133', '152', '172'],
        [null, null, null, null, null, null, '173'],
        [null, null, null, '105', '116', '134', '153', '174'],
        [null, null, null, '106', '117', '135', '154', '175'],
        [null, null, null, '107', '118', '136', '155', '176'],
        [null, null, null, '108', '119', '137', '156', '177'],
        [null, null, null, '109', '120', '138', '157', '178'],
        [null, null, null, null, '121', '139', '158', '179'],
        [null, null, null, null, '122', '140', '159', '180'],
        [null, null, null, null, '123', '141', '160', '181'],
        [null, null, null, null, null, '142', '161', '182'],
        [null, null, null, null, null, null, '162', '183'],
        [null, null, null, null, null, null, null, '184'],
        [null, null, null, null, null, null, null, '185'],
      ],
    },
    {
      name: 'front-ringside',
      seatMap: [
        [null, null, null, '204', null, '203', '202', '201', null],
        [
          '220',
          '219',
          '218',
          '217',
          '216',
          '215',
          '214',
          '213',
          '212',
          '211',
          '210',
          '209',
          '208',
          '207',
          '206',
          null,
        ],

        [
          '236',
          '235',
          '234',
          '233',
          '232',
          '231',
          '230',
          '229',
          '228',
          '227',
          '226',
          '225',
          '224',
          '223',
          '222',
          '221',
        ],

        [
          '252',
          '251',
          '250',
          '249',
          '248',
          '247',
          '246',
          '245',
          '244',
          '243',
          '242',
          '241',
          '240',
          '239',
          '238',
          '237',
        ],
        [
          '268',
          '267',
          '266',
          '265',
          '264',
          '263',
          '262',
          '261',
          '260',
          '259',
          '258',
          '257',
          '256',
          '255',
          '254',
          '253',
        ],
      ],
    },
  ];

  for (const z of zones) {
    const found = await zoneService.findAll();
    if (!found.find((zone) => zone.name === z.name)) {
      await zoneService.create(z);
      console.log(`✅ Zone created: ${z.name}`);
    }
  }

  await app.close();
}
bootstrap();
