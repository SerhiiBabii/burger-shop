const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    DeleteCommand,
    PutCommand,
    UpdateCommand,
    ScanCommand
} = require("@aws-sdk/lib-dynamodb");
const cors = require("cors");
const { v1: uuidV1, v4: uuidV4 } = require("uuid");
const express = require("express");
const serverless = require("serverless-http");
const S3 = require("./handler/common/S3");
const { extractFile } = require("./handler/helpers/extractFile");

const app = express();

const ORDER_TABLE = process.env.ORDER_TABLE;
const BURGER_TABLE = process.env.BURGER_TABLE;
const IMAGE_BUCKET = process.env.IMAGE_BUCKET;
const client = new DynamoDBClient({});
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:4000',
  methods: "GET,PUT,POST,DELETE",
  maxAge: 1800
}));

// Burgers
app.get("/api/burger", async function (req, res) {
  const params = {
    TableName: BURGER_TABLE
  };

  try {
    const { Items } = await dynamoDbClient.send(new ScanCommand(params));

    if (Items) {
      res.json(Items);
    } else {
      res.status(404).json({ error: 'Could not find burgers' });
    }
  } catch(error) {
    console.error("Could not retrieve burgers");

    res.status(500).json({ error: "Could not retrieve burgers" });
  }
});

app.get("/api/burger/:id", async function (req, res) {
  const params = {
    TableName: BURGER_TABLE,
    Key: {
      id: req.params.id,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));

    if (Item) {
      res.json(Item);
    } else {
        res.status(404).json({ error: `Could not find burger with provided "${ req.params.id }"` });
    }
  } catch(error) {
    console.error("Could not retrieve burger");

    res.status(500).json({ error: "Could not retrieve burger" });
  }
});

app.post("/api/burger", async function (req, res) {
  const timestamp = new Date().getTime();
  const { name, price, ingredients, image = '' } = req.body;

  const params = {
    TableName: BURGER_TABLE,
    Item: {
      id: uuidV1(),
      name,
      price,
      ingredients: ingredients.replace(/\s*,\s*/g, ",").split(',').filter(Boolean),
      image,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));

    res.status(200).json({ message: 'The burger is created' });
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: 'Could not create burger' });
  }
});

app.put("/api/burger/:id", async function (req, res) {
  const { name, price, ingredients, image } = req.body;
  const timestamp = new Date().getTime();

  const params = {
    TableName: BURGER_TABLE,
    Key: {
      id: req.params.id,
    },
    ExpressionAttributeNames: {
      "#name_text": "name"
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":price": price,
      ":ingredients": ingredients.replace(/\s*,\s*/g, ",").split(',').filter(Boolean),
      ":image": image,
      ":updatedAt": timestamp
    },
    UpdateExpression: "SET #name_text = :name, price = :price, ingredients = :ingredients, image = :image, updatedAt = :updatedAt"
  };

  try {
    const { Attributes } = await dynamoDbClient.send(new UpdateCommand(params));

    if (Attributes) {
      res.json(Attributes);
    } else {
        res.status(404).json({ error: `Could not update burger with ${ req.params.id }` });
    }
  } catch(error) {
    console.error("Could not update burger");

    res.status(500).json({ error: "Could not update burger" });
  }
});

app.delete("/api/burger/:id", async function (req, res) {
  const params = {
    TableName: BURGER_TABLE,
    Key: {
      id: req.params.id,
    }
  };

  try {
    const { '$metadata': { httpStatusCode } } = await dynamoDbClient.send(new DeleteCommand(params));

    if (httpStatusCode === 200) {
      res.status(200).json({ message: 'The burger is deleted' });
    } else {
      res.status(404).json({ error: `Could not delete burger with ${ req.params.id }` });
    }
  } catch(error) {
    console.error(error);

    res.status(500).json({ error: "Could not retrieve burgers" });
  }
});

// Orders
app.get("/api/order", async function (req, res) {
  const params = {
    TableName: ORDER_TABLE
  };

  try {
    const { Items: orders } = await dynamoDbClient.send(new ScanCommand(params));

    if (orders) {
      res.json(orders);
    } else {
      res.status(404).json({ error: 'Could not find orders' });
    }
  } catch(error) {
    console.error("Could not retrieve orders");

    res.status(500).json({ error: "Could not retrieve orders" });
  }
});

app.get("/api/order/:id", async function (req, res) {
  const params = {
    TableName: ORDER_TABLE,
    Key: {
      id: req.params.id,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));

    if (Item) {
      res.json(Item);
    } else {
      res.status(404).json({ error: `Could not find order with provided "${ req.params.id }"` });
    }
  } catch(error) {
    console.error("Could not retrieve order");

    res.status(500).json({ error: "Could not retrieve order" });
  }
});

app.post("/api/order", async function (req, res) {
  const timestamp = new Date().getTime();
  const { customer, order, totalCost, comment, address } = req.body;

  const params = {
    TableName: ORDER_TABLE,
    Item: {
      id: uuidV4(),
      customer,
      order,
      totalCost,
      comment,
      createdAt: timestamp,
      updatedAt: timestamp,
      address
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));

    res.status(200).json({ message: "The order is created" });
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: "Could not create order" });
  }
});

app.put("/api/burger/:id", async function (req, res) {
  const { customer, order, totalCost, comment } = req.body;
  const timestamp = new Date().getTime();

  const params = {
    TableName: ORDER_TABLE,
    Key: {
      id: req.params.id,
    },
    ExpressionAttributeNames: {
      "#comment_text": "comment"
    },
    ExpressionAttributeValues: {
      ":comment": comment,
      ":customer": customer,
      ":order": order,
      ":totalCost": totalCost,
      ":updatedAt": timestamp
    },
    UpdateExpression: "SET #comment_text = :comment, customer = :customer, order = :order, totalCost = :totalCost, updatedAt = :updatedAt"
  };

  try {
    const { Attributes } = await dynamoDbClient.send(new UpdateCommand(params));

    if (Attributes) {
      res.json(Attributes);
    } else {
      res.status(404).json({ error: `Could not update burger with ${ req.params.id }` });
    }
  } catch(error) {
    console.error("Could not update burger");

    res.status(500).json({ error: "Could not update burger" });
  }
});

app.delete("/api/order/:id", async function (req, res) {
  const params = {
    TableName: ORDER_TABLE,
    Key: {
      id: req.params.id,
    }
  };

  try {
    const { httpStatusCode } = await dynamoDbClient.send(new DeleteCommand(params));

    if (httpStatusCode === 200) {
      res.status(200).json({ message: 'The order is deleted' });
    } else {
      res.status(404).json({ error: `Could not delete order with ${ req.params.id }` });
    }
  } catch(error) {
    console.error(error);

    res.status(500).json({ error: "Could not retrieve orders" });
  }
});

//burger images
app.get("/api/image", async function (req, res) {
  try {
    const [ error, urls ] = await S3.getAll(IMAGE_BUCKET);

    if (urls) {
      res.json(urls);
    } else {
      console.error(error);

      res.status(404).json({ error: 'Could not find images' });
    }
  } catch(err) {
    console.error("Could not retrieve images", err);

    res.status(500).json({ error: "Could not retrieve images" });
  }
});

app.get("/api/image/:imageName", async function (req, res) {
  const { imageName } = req.params;

  try {
    const url = `https://${IMAGE_BUCKET}.s3-${process.env.REGION}.amazonaws.com/${imageName}`;
  
    if (url) {
      res.json({ url });
    } else {
      res.status(404).json({ error: `Could not find image with provided "${ imageName }"` });
    }
  } catch(error) {
    console.error("Could not retrieve order");

    res.status(500).json({ error: "Could not retrieve image" });
  }
});

app.post("/api/image", async function (req, res) {
  const { filename, data } = extractFile(req);

  if (!filename.match(/\.(jpg|jpeg|png)$/i)) {
    res.status(404).json({ error: "Invalid file extension" });
  }

  try {
    const [ error, url ] = await S3.write(data, filename, IMAGE_BUCKET);

    if (url) {
      res.status(200).json({ url, message: "The image is created" });
    } else {
      console.error(error);

      res.status(404).json({ error: "Could not create image" });
    }

  } catch (error) {
    console.error(error);

    res.status(500).json({ error: "Could not create image" });
  }
});

module.exports.handler = serverless(app);