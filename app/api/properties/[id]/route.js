import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import {
  buildPropertyScope,
  countActiveBookings,
  isValidObjectId,
} from "@/lib/tenancy";

const PROPERTY_TYPES = new Set(["hotel", "cabana", "casa"]);

async function getWritableProperty(request, params) {
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
  const property = isValidObjectId(id)
    ? await Property.findOne({ _id: id, ...buildPropertyScope(user) })
    : null;

  if (!property) {
    return {
      response: NextResponse.json(
        { error: "Propiedad no encontrada." },
        { status: 404 }
      ),
    };
  }

  return { user, property };
}

export async function PUT(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  const name = has("name") ? String(body.name || "").trim().slice(0, 120) : null;
  const type = has("type") ? String(body.type || "") : null;

  if (has("name") && !name) {
    return NextResponse.json(
      { error: "El nombre de la propiedad no puede estar vacío." },
      { status: 400 }
    );
  }

  if (has("type") && !PROPERTY_TYPES.has(type)) {
    return NextResponse.json({ error: "Tipo de propiedad inválido." }, { status: 400 });
  }

  try {
    const { user, property, response } = await getWritableProperty(
      request,
      params
    );
    if (response) return response;

    if (has("name")) property.name = name;
    if (has("type")) property.type = type;
    if (has("address")) property.address = String(body.address || "").trim().slice(0, 200);
    if (has("description")) {
      property.description = String(body.description || "").trim().slice(0, 2000);
    }
    if (!property.organizationId && user.organizationId) {
      property.organizationId = user.organizationId;
    }

    await property.save();

    return NextResponse.json({ property }, { status: 200 });
  } catch (error) {
    console.error("[properties/:id PUT]", error);
    return NextResponse.json(
      { error: "Error al actualizar la propiedad." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { property, response } = await getWritableProperty(request, params);
    if (response) return response;

    const activeBookings = await countActiveBookings({ propertyId: property._id });
    if (activeBookings > 0) {
      return NextResponse.json(
        {
          error: `La propiedad tiene ${activeBookings} reserva(s) en curso o futuras. Cancelalas antes de eliminarla.`,
        },
        { status: 409 }
      );
    }

    const [{ deletedCount: deletedBookings }, { deletedCount: deletedRooms }] =
      await Promise.all([
        Booking.deleteMany({ propertyId: property._id }),
        Room.deleteMany({ propertyId: property._id }),
      ]);
    await property.deleteOne();

    return NextResponse.json(
      { message: "Propiedad eliminada.", deletedRooms, deletedBookings },
      { status: 200 }
    );
  } catch (error) {
    console.error("[properties/:id DELETE]", error);
    return NextResponse.json(
      { error: "Error al eliminar la propiedad." },
      { status: 500 }
    );
  }
}
