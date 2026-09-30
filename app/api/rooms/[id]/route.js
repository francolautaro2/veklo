import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import Booking from "@/models/Booking";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import {
  buildPropertyScope,
  countActiveBookings,
  isValidObjectId,
} from "@/lib/tenancy";

function parseBasePrice(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return Math.round(num * 100) / 100;
}

function parseCapacity(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 100) return null;
  return num;
}

// Carga la habitación verificando que pertenezca a una propiedad del usuario.
async function getWritableRoom(request, params) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return {
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  const denied = getAccessDeniedResponse(user);
  if (denied) return { response: denied };

  const { id } = await params;
  const room = isValidObjectId(id) ? await Room.findById(id) : null;
  if (!room) {
    return {
      response: NextResponse.json(
        { error: "Habitación no encontrada." },
        { status: 404 }
      ),
    };
  }

  const property = await Property.findOne({
    _id: room.propertyId,
    ...buildPropertyScope(user),
  }).select("_id organizationId");

  if (!property) {
    return {
      response: NextResponse.json(
        { error: "No tenés permiso para modificar esta habitación." },
        { status: 403 }
      ),
    };
  }

  return { user, room, property };
}

export async function PUT(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasCapacity = Object.prototype.hasOwnProperty.call(body, "capacity");
  const hasBasePrice = Object.prototype.hasOwnProperty.call(body, "basePrice");

  const name = hasName ? String(body.name || "").trim().slice(0, 80) : null;
  const capacity = hasCapacity ? parseCapacity(body.capacity) : null;
  const basePrice = hasBasePrice ? parseBasePrice(body.basePrice) : null;

  if (hasName && !name) {
    return NextResponse.json(
      { error: "El nombre de la habitación no puede estar vacío." },
      { status: 400 }
    );
  }

  if (hasCapacity && capacity === null) {
    return NextResponse.json(
      { error: "La capacidad debe ser un número entero entre 1 y 100." },
      { status: 400 }
    );
  }

  if (hasBasePrice && basePrice === null) {
    return NextResponse.json({ error: "Precio base inválido." }, { status: 400 });
  }

  try {
    const { user, room, property, response } = await getWritableRoom(
      request,
      params
    );
    if (response) return response;

    if (!property.organizationId && user.organizationId) {
      property.organizationId = user.organizationId;
      await property.save();
    }

    if (!room.organizationId && user.organizationId) {
      room.organizationId = user.organizationId;
    }

    if (hasName) room.name = name;
    if (hasCapacity) room.capacity = capacity;
    if (hasBasePrice) room.basePrice = basePrice;
    await room.save();

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    console.error("[rooms/:id PUT]", error);
    return NextResponse.json(
      { error: "Error al actualizar la habitación." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { room, response } = await getWritableRoom(request, params);
    if (response) return response;

    const activeBookings = await countActiveBookings({ roomId: room._id });
    if (activeBookings > 0) {
      return NextResponse.json(
        {
          error: `La habitación tiene ${activeBookings} reserva(s) en curso o futuras. Cancelalas antes de eliminarla.`,
        },
        { status: 409 }
      );
    }

    const { deletedCount } = await Booking.deleteMany({ roomId: room._id });
    await room.deleteOne();

    return NextResponse.json(
      { message: "Habitación eliminada.", deletedBookings: deletedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("[rooms/:id DELETE]", error);
    return NextResponse.json(
      { error: "Error al eliminar la habitación." },
      { status: 500 }
    );
  }
}
